import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

export const DEMO_PASSWORD = "demo1234";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromToday(offset: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + offset * DAY_MS);
}

const standardServices = (prices: [number, number, number, number]) => [
  { name: "Mise en cale sèche", description: "Entrée en forme, calage et assèchement.", priceEur: prices[0] },
  { name: "Sablage et peinture antifouling", description: "Décapage de la coque et application d'antifouling.", priceEur: prices[1] },
  { name: "Inspection coque et hélice", description: "Contrôle visuel, mesures d'épaisseur et polissage de l'hélice.", priceEur: prices[2] },
  { name: "Préparation visite de classe", description: "Préparation des documents et des points de contrôle de la société de classification.", priceEur: prices[3] },
];

// Dock dimensions are (max length, max beam, max draft) in metres.
// Slots are [startOffset, endOffset) in days from today, never overlapping on a dock.
const shipyards = [
  {
    name: "Marseille Grand Carénage",
    port: "Marseille",
    country: "France",
    services: standardServices([45000, 120000, 15000, 25000]),
    docks: [
      { name: "Forme 8", dims: [220, 34, 9], slots: [[7, 19], [35, 47], [70, 82]] },
      { name: "Forme 10", dims: [320, 52, 14], slots: [[14, 28], [50, 64]] },
    ],
  },
  {
    name: "Chantiers du Ponant",
    port: "Brest",
    country: "France",
    services: standardServices([42000, 110000, 14000, 23000]),
    docks: [
      { name: "Forme 2", dims: [225, 36, 9.5], slots: [[10, 20], [45, 55]] },
      { name: "Forme 3", dims: [300, 50, 13.5], slots: [[25, 39]] },
    ],
  },
  {
    name: "Atlantique Dock Services",
    port: "Saint-Nazaire",
    country: "France",
    services: standardServices([50000, 130000, 16000, 26000]),
    docks: [{ name: "Forme Joubert", dims: [350, 55, 15], slots: [[20, 34], [60, 74]] }],
  },
  {
    name: "Bizerte Naval Repair",
    port: "Bizerte",
    country: "Tunisie",
    services: standardServices([30000, 85000, 10000, 18000]).slice(0, 3),
    docks: [{ name: "Bassin 1", dims: [200, 32, 8.5], slots: [[15, 27]] }],
  },
] as const;

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`TRUNCATE TABLE booking_services, bookings, slots, services, docks, vessels, users, companies, shipyards CASCADE`;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const shipyardIds: Record<string, string> = {};

  for (const yard of shipyards) {
    const created = await prisma.shipyard.create({
      data: {
        name: yard.name,
        port: yard.port,
        country: yard.country,
        services: { create: [...yard.services] },
        docks: {
          create: yard.docks.map((dock) => ({
            name: dock.name,
            maxLengthM: dock.dims[0],
            maxBeamM: dock.dims[1],
            maxDraftM: dock.dims[2],
            slots: {
              create: dock.slots.map(([start, end]) => ({
                startDate: daysFromToday(start),
                endDate: daysFromToday(end),
              })),
            },
          })),
        },
      },
    });
    shipyardIds[yard.port] = created.id;
  }

  const company = await prisma.company.create({
    data: {
      name: "Méridien Ferries",
      vessels: {
        create: [
          { name: "Méridien Express", imo: "9400001", type: "Ferry ro-pax", lengthM: 176, beamM: 30.5, draftM: 6.8, grossTonnage: 32000 },
          { name: "Méridien Cargo", imo: "9400002", type: "Porte-conteneurs", lengthM: 260, beamM: 40, draftM: 12.5, grossTonnage: 52000 },
        ],
      },
    },
    include: { vessels: true },
  });

  const owner = await prisma.user.create({
    data: { email: "armateur@demo.fr", name: "Claire Martin", role: "OWNER", passwordHash, companyId: company.id },
  });
  await prisma.user.createMany({
    data: [
      { email: "chantier@demo.fr", name: "Marc Rossi", role: "SHIPYARD", passwordHash, shipyardId: shipyardIds["Marseille"] },
      { email: "brest@demo.fr", name: "Yann Le Gall", role: "SHIPYARD", passwordHash, shipyardId: shipyardIds["Brest"] },
      { email: "admin@demo.fr", name: "Sophie Admin", role: "ADMIN", passwordHash },
    ],
  });

  const firstMarseilleSlot = await prisma.slot.findFirstOrThrow({
    where: { dock: { shipyardId: shipyardIds["Marseille"] } },
    orderBy: { startDate: "asc" },
    include: { dock: { include: { shipyard: { include: { services: { orderBy: { name: "asc" } } } } } } },
  });
  const express = company.vessels.find((vessel) => vessel.imo === "9400001");
  if (!express) throw new Error("Seed vessel missing");

  await prisma.booking.create({
    data: {
      slotId: firstMarseilleSlot.id,
      vesselId: express.id,
      requestedById: owner.id,
      notes: "Carénage annuel, prévoir une inspection de la ligne d'arbre.",
      services: {
        create: firstMarseilleSlot.dock.shipyard.services
          .filter((service) => service.name.startsWith("Mise") || service.name.startsWith("Sablage"))
          .map((service) => ({ serviceId: service.id })),
      },
    },
  });
}
