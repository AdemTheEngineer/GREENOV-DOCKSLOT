import { Prisma } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "../prisma/seed-data";
import { prisma } from "../src/lib/prisma";
import { bookingsRepository } from "../src/modules/bookings/bookings.repository";
import { vesselsRepository } from "../src/modules/vessels/vessels.repository";
import { app, competingRequest, loginAs, otherCompanyVessel, searchWindow, seededBooking, vesselByImo, type Agent } from "./helpers";

beforeEach(() => seedDatabase(prisma));
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

const OWNER = "armateur@demo.fr";
const MARSEILLE = "chantier@demo.fr";
const BREST = "brest@demo.fr";
const ADMIN = "admin@demo.fr";

const expectError = (res: request.Response, status: number, code: string) => {
  expect(res.status).toBe(status);
  expect(res.body.error.code).toBe(code);
  expect(typeof res.body.error.message).toBe("string");
};

const forme8Slots = () =>
  prisma.slot.findMany({ where: { dock: { name: "Forme 8" } }, orderBy: { startDate: "asc" }, include: { dock: true } });

async function search(owner: Agent, vesselId: string, port = "Marseille") {
  return owner.get("/api/v1/slots/search").query({ vesselId, port, ...searchWindow() });
}

describe("INV-1 compatibility uses ≤ on all three dimensions", () => {
  async function vesselWithHull(lengthM: number, beamM: number, draftM: number) {
    const owner = await loginAs(OWNER);
    const res = await owner
      .post("/api/v1/vessels")
      .send({ name: "Gabarit", imo: "9455555", type: "Ferry", lengthM, beamM, draftM, grossTonnage: 1000 })
      .expect(201);
    return { owner, vesselId: res.body.vessel.id as string };
  }

  it("offers and books a dock whose maxima equal the vessel's dimensions", async () => {
    const { owner, vesselId } = await vesselWithHull(220, 34, 9);
    const res = await search(owner, vesselId);
    expect(res.body.slots.some((slot: { dock: { name: string } }) => slot.dock.name === "Forme 8")).toBe(true);

    const [, slot] = await forme8Slots();
    const service = await prisma.service.findFirstOrThrow({ where: { shipyardId: slot!.dock.shipyardId } });
    await owner.post("/api/v1/bookings").send({ slotId: slot!.id, vesselId, serviceIds: [service.id] }).expect(201);
  });

  it.each([
    ["length", 220.01, 34, 9],
    ["beam", 220, 34.01, 9],
    ["draft", 220, 34, 9.01],
  ])("hides and refuses the dock when the %s exceeds it by 1 cm", async (_dimension, lengthM, beamM, draftM) => {
    const { owner, vesselId } = await vesselWithHull(lengthM, beamM, draftM);
    const res = await search(owner, vesselId);
    expect(res.body.slots.some((slot: { dock: { name: string } }) => slot.dock.name === "Forme 8")).toBe(false);

    const [, slot] = await forme8Slots();
    const service = await prisma.service.findFirstOrThrow({ where: { shipyardId: slot!.dock.shipyardId } });
    expectError(await owner.post("/api/v1/bookings").send({ slotId: slot!.id, vesselId, serviceIds: [service.id] }), 422, "VESSEL_INCOMPATIBLE");
  });
});

describe("INV-2 slots never overlap", () => {
  it("allows a slot starting the day the previous one ends (half-open ranges)", async () => {
    const shipyard = await loginAs(MARSEILLE);
    const [first] = await forme8Slots();
    const day = (offset: number) => new Date(first!.endDate.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

    // The seed leaves the days right after the first Forme 8 slot free.
    await shipyard.post("/api/v1/shipyard/slots").send({ dockId: first!.dockId, startDate: day(0), endDate: day(2) }).expect(201);
    expectError(await shipyard.post("/api/v1/shipyard/slots").send({ dockId: first!.dockId, startDate: day(-1), endDate: day(1) }), 409, "SLOT_OVERLAP");
  });

  it("rejects an overlap even when inserted directly in the database (23P01)", async () => {
    const [first] = await forme8Slots();
    await expect(
      prisma.slot.create({ data: { dockId: first!.dockId, startDate: first!.startDate, endDate: first!.endDate } }),
    ).rejects.toThrow(/23P01/);
  });
});

describe("INV-4 accept is atomic", () => {
  it("leaves nothing changed when the last step of the transaction fails", async () => {
    const owner = await loginAs(OWNER);
    const { firstId, secondId, slotId } = await competingRequest(owner);
    vi.spyOn(bookingsRepository, "rejectOtherPending").mockRejectedValueOnce(new Error("simulated failure"));
    const shipyard = await loginAs(MARSEILLE);

    const res = await shipyard.patch(`/api/v1/shipyard/bookings/${firstId}/decision`).send({ decision: "ACCEPT" });

    expectError(res, 500, "INTERNAL_ERROR");
    const bookings = await prisma.booking.findMany({ where: { id: { in: [firstId, secondId] } } });
    expect(bookings.map((booking) => booking.status)).toEqual(["PENDING", "PENDING"]);
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slotId } })).status).toBe("OPEN");
  });
});

describe("INV-5 state machine", () => {
  it("lets the owner cancel a pending booking once", async () => {
    const owner = await loginAs(OWNER);
    const { id } = await seededBooking();
    const res = await owner.patch(`/api/v1/bookings/${id}/cancel`).expect(200);
    expect(res.body.booking.status).toBe("CANCELLED");

    expectError(await owner.patch(`/api/v1/bookings/${id}/cancel`), 409, "ALREADY_DECIDED");
    const shipyard = await loginAs(MARSEILLE);
    expectError(await shipyard.patch(`/api/v1/shipyard/bookings/${id}/decision`).send({ decision: "ACCEPT" }), 409, "ALREADY_DECIDED");
  });

  it("refuses every transition out of ACCEPTED or REJECTED", async () => {
    const owner = await loginAs(OWNER);
    const { firstId, secondId } = await competingRequest(owner);
    const shipyard = await loginAs(MARSEILLE);
    await shipyard.patch(`/api/v1/shipyard/bookings/${firstId}/decision`).send({ decision: "ACCEPT" }).expect(200);

    for (const id of [firstId, secondId]) {
      expectError(await shipyard.patch(`/api/v1/shipyard/bookings/${id}/decision`).send({ decision: "ACCEPT" }), 409, "ALREADY_DECIDED");
      expectError(await shipyard.patch(`/api/v1/shipyard/bookings/${id}/decision`).send({ decision: "REJECT" }), 409, "ALREADY_DECIDED");
      expectError(await owner.patch(`/api/v1/bookings/${id}/cancel`), 409, "ALREADY_DECIDED");
    }
  });

  it("never offers a BOOKED slot and refuses new requests on it", async () => {
    const owner = await loginAs(OWNER);
    const seeded = await seededBooking();
    const shipyard = await loginAs(MARSEILLE);
    await shipyard.patch(`/api/v1/shipyard/bookings/${seeded.id}/decision`).send({ decision: "ACCEPT" }).expect(200);
    const navette = await owner
      .post("/api/v1/vessels")
      .send({ name: "Navette", imo: "9466666", type: "Ferry", lengthM: 100, beamM: 20, draftM: 5, grossTonnage: 1000 })
      .expect(201);

    const res = await search(owner, navette.body.vessel.id);
    expect(res.body.slots.map((slot: { id: string }) => slot.id)).not.toContain(seeded.slotId);
    const serviceIds = [seeded.slot.dock.shipyard.services[0]!.id];
    expectError(await owner.post("/api/v1/bookings").send({ slotId: seeded.slotId, vesselId: navette.body.vessel.id, serviceIds }), 409, "SLOT_UNAVAILABLE");
  });
});

describe("INV-6 tenant isolation", () => {
  it("keeps another company's vessels and bookings out of reach of an owner", async () => {
    const owner = await loginAs(OWNER);
    const foreign = await otherCompanyVessel();
    const seeded = await seededBooking();
    const foreignBooking = await prisma.booking.create({
      data: { slotId: seeded.slotId, vesselId: foreign.id, requestedById: seeded.requestedById, services: { create: [{ serviceId: seeded.slot.dock.shipyard.services[0]!.id }] } },
    });

    expectError(await search(owner, foreign.id), 404, "NOT_FOUND");
    expectError(await owner.post("/api/v1/bookings").send({ slotId: seeded.slotId, vesselId: foreign.id, serviceIds: [seeded.slot.dock.shipyard.services[1]!.id] }), 404, "NOT_FOUND");
    expectError(await owner.patch(`/api/v1/bookings/${foreignBooking.id}/cancel`), 404, "NOT_FOUND");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: foreignBooking.id } })).status).toBe("PENDING");

    const vessels = await owner.get("/api/v1/vessels").expect(200);
    const mine = await owner.get("/api/v1/bookings/mine").expect(200);
    expect(JSON.stringify(vessels.body)).not.toContain(foreign.id);
    expect(JSON.stringify(mine.body)).not.toContain(foreignBooking.id);
  });

  it("ignores client-supplied tenant ids (mass assignment)", async () => {
    const owner = await loginAs(OWNER);
    const foreign = await otherCompanyVessel();
    const res = await owner
      .post("/api/v1/vessels")
      .send({ name: "Intrus", imo: "9477777", type: "Ferry", lengthM: 100, beamM: 20, draftM: 5, grossTonnage: 1000, companyId: foreign.companyId })
      .expect(201);
    const own = await vesselByImo("9400001");
    expect((await prisma.vessel.findUniqueOrThrow({ where: { id: res.body.vessel.id } })).companyId).toBe(own.companyId);

    const brest = await loginAs(BREST);
    const marseille = await prisma.shipyard.findFirstOrThrow({ where: { port: "Marseille" } });
    const service = await brest.post("/api/v1/shipyard/services").send({ name: "Service Brest", shipyardId: marseille.id }).expect(201);
    expect((await prisma.service.findUniqueOrThrow({ where: { id: service.body.service.id } })).shipyardId).not.toBe(marseille.id);
  });

  it("prevents a shipyard from creating slots on another shipyard's dock", async () => {
    const brest = await loginAs(BREST);
    const [marseilleSlot] = await forme8Slots();
    expectError(
      await brest.post("/api/v1/shipyard/slots").send({ dockId: marseilleSlot!.dockId, startDate: "2030-01-01", endDate: "2030-01-05" }),
      404,
      "NOT_FOUND",
    );
    expect(await prisma.slot.count({ where: { startDate: new Date("2030-01-01T00:00:00Z") } })).toBe(0);
  });
});

describe("INV-7 every protected route checks authentication and role", () => {
  const routes: { method: "get" | "post" | "patch"; path: string; role: "OWNER" | "SHIPYARD" | "ADMIN" | "ANY" }[] = [
    { method: "get", path: "/auth/me", role: "ANY" },
    { method: "get", path: "/ports", role: "ANY" },
    { method: "get", path: "/vessels", role: "OWNER" },
    { method: "post", path: "/vessels", role: "OWNER" },
    { method: "get", path: "/slots/search", role: "OWNER" },
    { method: "post", path: "/bookings", role: "OWNER" },
    { method: "get", path: "/bookings/mine", role: "OWNER" },
    { method: "patch", path: "/bookings/x/cancel", role: "OWNER" },
    { method: "get", path: "/shipyard/bookings", role: "SHIPYARD" },
    { method: "patch", path: "/shipyard/bookings/x/decision", role: "SHIPYARD" },
    { method: "get", path: "/shipyard/slots", role: "SHIPYARD" },
    { method: "post", path: "/shipyard/slots", role: "SHIPYARD" },
    { method: "get", path: "/shipyard/services", role: "SHIPYARD" },
    { method: "post", path: "/shipyard/services", role: "SHIPYARD" },
    { method: "get", path: "/shipyard/docks", role: "SHIPYARD" },
    { method: "get", path: "/admin/bookings", role: "ADMIN" },
    { method: "get", path: "/admin/stats", role: "ADMIN" },
  ];

  it("answers 401 without a session cookie and with a forged token", async () => {
    for (const route of routes) {
      expectError(await request(app)[route.method](`/api/v1${route.path}`), 401, "UNAUTHENTICATED");
      expectError(await request(app)[route.method](`/api/v1${route.path}`).set("Cookie", "dockslot_token=forged.token.value"), 401, "UNAUTHENTICATED");
    }
  });

  it("answers 403 to every other role", async () => {
    const agents = { OWNER: await loginAs(OWNER), SHIPYARD: await loginAs(MARSEILLE), ADMIN: await loginAs(ADMIN) };
    for (const route of routes.filter((r) => r.role !== "ANY")) {
      for (const [role, agent] of Object.entries(agents)) {
        if (role === route.role) continue;
        expectError(await agent[route.method](`/api/v1${route.path}`).send({}), 403, "FORBIDDEN");
      }
    }
  });
});

describe("INV-8 invalid input is a 400 VALIDATION_ERROR", () => {
  const vessel = { name: "Valide", imo: "9488888", type: "Ferry", lengthM: 100, beamM: 20, draftM: 5, grossTonnage: 1000 };

  it.each([
    ["IMO with 6 digits", { imo: "940000" }],
    ["IMO with 8 digits", { imo: "94000011" }],
    ["IMO with letters", { imo: "94OOOO1" }],
    ["zero length", { lengthM: 0 }],
    ["negative beam", { beamM: -2 }],
    ["string draft", { draftM: "5" }],
    ["NUL byte in name [F-002]", { name: "Nul\u0000l" }],
    ["NUL byte in type [F-002]", { type: "Fe\u0000rry" }],
  ])("rejects a vessel with %s", async (_label, patch) => {
    const owner = await loginAs(OWNER);
    expectError(await owner.post("/api/v1/vessels").send({ ...vessel, ...patch }), 400, "VALIDATION_ERROR");
  });

  it("rejects bad slots, bookings, decisions, queries and malformed JSON", async () => {
    const owner = await loginAs(OWNER);
    const shipyard = await loginAs(MARSEILLE);
    const admin = await loginAs(ADMIN);
    const seeded = await seededBooking();
    const [, openSlot] = await forme8Slots();
    const express = await vesselByImo("9400001");
    const brestService = await prisma.service.findFirstOrThrow({ where: { shipyard: { port: "Brest" } } });
    const dockId = seeded.slot.dockId;

    const cases = [
      shipyard.post("/api/v1/shipyard/slots").send({ dockId, startDate: "2030-01-05", endDate: "2030-01-05" }),
      shipyard.post("/api/v1/shipyard/slots").send({ dockId, startDate: "2030-01-09", endDate: "2030-01-05" }),
      shipyard.post("/api/v1/shipyard/slots").send({ dockId, startDate: "05/01/2030", endDate: "2030-01-09" }),
      shipyard.post("/api/v1/shipyard/slots").send({ dockId, startDate: "2031-02-29", endDate: "2031-03-05" }),
      shipyard.post("/api/v1/shipyard/slots").send({ dockId: "do\u0000ck", startDate: "2030-01-01", endDate: "2030-01-05" }),
      shipyard.post("/api/v1/shipyard/services").send({ name: "Sans\u0000nom" }),
      shipyard.post("/api/v1/shipyard/services").send({ name: "Prix négatif", priceEur: -1 }),
      shipyard.patch(`/api/v1/shipyard/bookings/${seeded.id}/decision`).send({ decision: "MAYBE" }),
      shipyard.patch(`/api/v1/shipyard/bookings/${seeded.id}/decision`).send({ decision: "REJECT", comment: "a\u0000b" }),
      owner.post("/api/v1/bookings").send({ slotId: openSlot!.id, vesselId: express.id, serviceIds: [] }),
      owner.post("/api/v1/bookings").send({ slotId: openSlot!.id, vesselId: express.id, serviceIds: [brestService.id] }),
      owner.post("/api/v1/bookings").send({ slotId: openSlot!.id, vesselId: express.id, serviceIds: [brestService.id], notes: "x\u0000" }),
      owner.patch("/api/v1/bookings/ab%00cd/cancel"),
      owner.get("/api/v1/slots/search").query({ port: "Marseille" }),
      owner.get("/api/v1/slots/search").query({ vesselId: express.id, port: "Mar\u0000seille", ...searchWindow() }),
      owner.get("/api/v1/slots/search").query({ vesselId: express.id, port: "Marseille", from: "2030-02-01", to: "2030-01-01" }),
      admin.get("/api/v1/admin/bookings").query({ status: "FOO" }),
      owner.post("/api/v1/vessels").set("Content-Type", "application/json").send('{"name":'),
    ];
    for (const [index, pending] of cases.entries()) {
      const res = await pending;
      expect({ index, status: res.status, code: res.body.error?.code }).toEqual({ index, status: 400, code: "VALIDATION_ERROR" });
    }
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: seeded.id } })).status).toBe("PENDING");
  });
});

describe("INV-9 uniform errors without leaks", () => {
  it("hides database errors behind a generic 500", async () => {
    const owner = await loginAs(OWNER);
    vi.spyOn(vesselsRepository, "listByCompany").mockRejectedValueOnce(
      new Prisma.PrismaClientUnknownRequestError("Invalid `prisma.vessel.findMany()` invocation: connection to 10.0.0.5 refused", { clientVersion: "6" }),
    );

    const res = await owner.get("/api/v1/vessels");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Une erreur interne est survenue." } });
  });

  it("answers an unknown route and an oversized body with the same shape [F-006]", async () => {
    const owner = await loginAs(OWNER);
    expectError(await owner.get("/api/v1/nope"), 404, "NOT_FOUND");
    const res = await owner.post("/api/v1/vessels").send({ name: "x".repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: { code: "PAYLOAD_TOO_LARGE", message: "La requête est trop volumineuse." } });
  });
});
