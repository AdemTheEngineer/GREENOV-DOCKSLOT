import request from "supertest";
import { expect } from "vitest";
import { DEMO_PASSWORD } from "../prisma/seed-data";
import { createApp } from "../src/app";
import { toIsoDate } from "../src/lib/dates";
import { prisma } from "../src/lib/prisma";

export const app = createApp();
export type Agent = ReturnType<typeof request.agent>;

export async function loginAs(email: string): Promise<Agent> {
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({ email, password: DEMO_PASSWORD }).expect(200);
  return agent;
}

export function searchWindow() {
  const today = new Date();
  return { from: toIsoDate(today), to: toIsoDate(new Date(today.getTime() + 90 * 86_400_000)) };
}

export const vesselByImo = (imo: string) => prisma.vessel.findUniqueOrThrow({ where: { imo } });

export const seededBooking = () =>
  prisma.booking.findFirstOrThrow({
    include: { slot: { include: { dock: { include: { shipyard: { include: { services: true } } } } } } },
  });

/** A vessel owned by a second company, to probe tenant isolation. */
export async function otherCompanyVessel() {
  const company = await prisma.company.create({ data: { name: "Autre Armement" } });
  return prisma.vessel.create({
    data: { companyId: company.id, name: "Navire Tiers", imo: "9499999", type: "Ferry", lengthM: 100, beamM: 20, draftM: 5, grossTonnage: 5000 },
  });
}

/** Adds a second small vessel and makes it request the same slot as the seeded booking. */
export async function competingRequest(owner: Agent) {
  const seeded = await seededBooking();
  const vessel = await prisma.vessel.create({
    data: {
      companyId: (await vesselByImo("9400001")).companyId,
      name: "Méridien Navette",
      imo: "9400003",
      type: "Ferry",
      lengthM: 120,
      beamM: 20,
      draftM: 5,
      grossTonnage: 9000,
    },
  });
  const serviceId = seeded.slot.dock.shipyard.services[0]?.id;
  const res = await owner
    .post("/api/v1/bookings")
    .send({ slotId: seeded.slotId, vesselId: vessel.id, serviceIds: [serviceId] });
  expect(res.status).toBe(201);
  return { firstId: seeded.id, secondId: res.body.booking.id as string, slotId: seeded.slotId };
}
