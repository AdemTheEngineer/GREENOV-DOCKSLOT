import type { SlotStatus } from "@dockslot/shared";
import type { Prisma, Vessel } from "@prisma/client";
import { pendingCount, slotDetailsInclude } from "../../lib/includes";
import { prisma } from "../../lib/prisma";

interface SearchParams {
  vessel: Vessel;
  port: string;
  from: Date;
  to: Date;
}

export const slotsRepository = {
  searchOpen: ({ vessel, port, from, to }: SearchParams) =>
    prisma.slot.findMany({
      where: {
        status: "OPEN",
        startDate: { gte: from, lte: to },
        dock: {
          maxLengthM: { gte: vessel.lengthM },
          maxBeamM: { gte: vessel.beamM },
          maxDraftM: { gte: vessel.draftM },
          shipyard: { port: { equals: port, mode: "insensitive" } },
        },
        bookings: { none: { vesselId: vessel.id, status: { in: ["PENDING", "ACCEPTED"] } } },
      },
      include: {
        dock: { include: { shipyard: { include: { services: { orderBy: { name: "asc" } } } } } },
        ...pendingCount,
      },
      orderBy: { startDate: "asc" },
    }),

  listByShipyard: (shipyardId: string) =>
    prisma.slot.findMany({
      where: { dock: { shipyardId } },
      include: { ...slotDetailsInclude, ...pendingCount },
      orderBy: { startDate: "asc" },
    }),

  create: (data: { dockId: string; startDate: Date; endDate: Date }) =>
    prisma.slot.create({ data, include: { ...slotDetailsInclude, ...pendingCount } }),

  findWithDock: (id: string, db: Prisma.TransactionClient) =>
    db.slot.findUnique({ where: { id }, include: { dock: true } }),

  // Row locks taken inside a transaction. FOR SHARE lets several booking requests
  // proceed together; FOR UPDATE (accept) waits for them and blocks other accepts.
  lockForShare: (id: string, db: Prisma.TransactionClient) =>
    db.$queryRaw<{ status: SlotStatus }[]>`SELECT status FROM slots WHERE id = ${id} FOR SHARE`,
  lockForUpdate: (id: string, db: Prisma.TransactionClient) =>
    db.$queryRaw<{ status: SlotStatus }[]>`SELECT status FROM slots WHERE id = ${id} FOR UPDATE`,

  markBooked: (id: string, db: Prisma.TransactionClient) =>
    db.slot.update({ where: { id }, data: { status: "BOOKED" } }),

  countByStatus: () => prisma.slot.groupBy({ by: ["status"], _count: { _all: true } }),
};
