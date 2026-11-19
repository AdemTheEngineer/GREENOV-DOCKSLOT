import type { SearchSlotDto } from "@dockslot/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "../prisma/seed-data";
import { prisma } from "../src/lib/prisma";
import { competingRequest, loginAs, searchWindow, seededBooking, vesselByImo } from "./helpers";

beforeEach(() => seedDatabase(prisma));
afterAll(() => prisma.$disconnect());

async function searchMarseille(imo: string): Promise<SearchSlotDto[]> {
  const owner = await loginAs("armateur@demo.fr");
  const vessel = await vesselByImo(imo);
  const res = await owner
    .get("/api/v1/slots/search")
    .query({ vesselId: vessel.id, port: "Marseille", ...searchWindow() })
    .expect(200);
  return res.body.slots;
}

describe("slot search", () => {
  it("(a) hides docks that are too small for Méridien Cargo", async () => {
    const slots = await searchMarseille("9400002");

    expect(slots.length).toBeGreaterThan(0);
    expect(new Set(slots.map((slot) => slot.dock.name))).toEqual(new Set(["Forme 10"]));
    for (const slot of slots) {
      expect(slot.dock.maxLengthM).toBeGreaterThanOrEqual(260);
      expect(slot.dock.maxBeamM).toBeGreaterThanOrEqual(40);
      expect(slot.dock.maxDraftM).toBeGreaterThanOrEqual(12.5);
    }
  });

  it("shows small docks to Méridien Express but not the slot it already requested", async () => {
    const slots = await searchMarseille("9400001");
    const seeded = await seededBooking();

    expect(slots.some((slot) => slot.dock.name === "Forme 8")).toBe(true);
    expect(slots.some((slot) => slot.id === seeded.slotId)).toBe(false);
  });
});

describe("booking creation", () => {
  it("(b) lets an owner request a slot with services", async () => {
    const owner = await loginAs("armateur@demo.fr");
    const [slot] = await searchMarseille("9400001");
    expect(slot).toBeDefined();
    const vessel = await vesselByImo("9400001");
    const serviceIds = slot!.services.slice(0, 2).map((service) => service.id);

    const res = await owner.post("/api/v1/bookings").send({ slotId: slot!.id, vesselId: vessel.id, serviceIds }).expect(201);

    expect(res.body.booking.status).toBe("PENDING");
    expect(res.body.booking.services).toHaveLength(2);
    const mine = await owner.get("/api/v1/bookings/mine").expect(200);
    expect(mine.body.bookings.map((b: { id: string }) => b.id)).toContain(res.body.booking.id);
  });

  it("refuses a vessel that does not fit the dock with 422", async () => {
    const owner = await loginAs("armateur@demo.fr");
    const seeded = await seededBooking();
    const cargo = await vesselByImo("9400002");

    const res = await owner
      .post("/api/v1/bookings")
      .send({ slotId: seeded.slotId, vesselId: cargo.id, serviceIds: [seeded.slot.dock.shipyard.services[0]!.id] })
      .expect(422);
    expect(res.body.error.code).toBe("VESSEL_INCOMPATIBLE");
  });
});

describe("tenant isolation", () => {
  it("(c) prevents a shipyard from deciding another shipyard's booking", async () => {
    const brest = await loginAs("brest@demo.fr");
    const seeded = await seededBooking();

    const res = await brest.patch(`/api/v1/shipyard/bookings/${seeded.id}/decision`).send({ decision: "ACCEPT" });

    expect([403, 404]).toContain(res.status);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: seeded.id } })).status).toBe("PENDING");
    const list = await brest.get("/api/v1/shipyard/bookings").expect(200);
    expect(list.body.bookings).toHaveLength(0);
  });

  it("forbids an owner from calling shipyard routes", async () => {
    const owner = await loginAs("armateur@demo.fr");
    const res = await owner.get("/api/v1/shipyard/bookings").expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("shipyard decision", () => {
  it("(d) accepting books the slot and rejects the competing requests", async () => {
    const owner = await loginAs("armateur@demo.fr");
    const { firstId, secondId, slotId } = await competingRequest(owner);
    const shipyard = await loginAs("chantier@demo.fr");

    const res = await shipyard.patch(`/api/v1/shipyard/bookings/${firstId}/decision`).send({ decision: "ACCEPT" }).expect(200);

    expect(res.body.booking.status).toBe("ACCEPTED");
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slotId } })).status).toBe("BOOKED");
    const other = await prisma.booking.findUniqueOrThrow({ where: { id: secondId } });
    expect(other.status).toBe("REJECTED");
    expect(other.shipyardComment).toBe("Créneau attribué à une autre demande.");
  });

  it("(e) lets exactly one of two concurrent accepts on the same slot succeed", async () => {
    const owner = await loginAs("armateur@demo.fr");
    const { firstId, secondId, slotId } = await competingRequest(owner);
    const shipyard = await loginAs("chantier@demo.fr");

    const responses = await Promise.all(
      [firstId, secondId].map((id) => shipyard.patch(`/api/v1/shipyard/bookings/${id}/decision`).send({ decision: "ACCEPT" })),
    );

    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(await prisma.booking.count({ where: { slotId, status: "ACCEPTED" } })).toBe(1);
  });

  it("rejects a second ACCEPTED booking on a slot at the database level", async () => {
    const owner = await loginAs("armateur@demo.fr");
    const { firstId, secondId } = await competingRequest(owner);

    await prisma.booking.update({ where: { id: firstId }, data: { status: "ACCEPTED" } });
    await expect(prisma.booking.update({ where: { id: secondId }, data: { status: "ACCEPTED" } })).rejects.toMatchObject({
      code: "P2002",
    });
  });
});

describe("shipyard slots", () => {
  it("(f) rejects an overlapping slot with 409 SLOT_OVERLAP", async () => {
    const shipyard = await loginAs("chantier@demo.fr");
    const seeded = await seededBooking();
    const start = seeded.slot.startDate.getTime();
    const day = 86_400_000;

    const res = await shipyard
      .post("/api/v1/shipyard/slots")
      .send({
        dockId: seeded.slot.dockId,
        startDate: new Date(start + 2 * day).toISOString().slice(0, 10),
        endDate: new Date(start + 5 * day).toISOString().slice(0, 10),
      })
      .expect(409);
    expect(res.body.error.code).toBe("SLOT_OVERLAP");
  });
});
