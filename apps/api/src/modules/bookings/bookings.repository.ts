import type { BookingStatus } from "@dockslot/shared";
import type { Prisma } from "@prisma/client";
import { bookingDetailsInclude } from "../../lib/includes";
import { prisma } from "../../lib/prisma";

type Db = Prisma.TransactionClient;

interface NewBooking {
  slotId: string;
  vesselId: string;
  requestedById: string;
  serviceIds: string[];
  notes?: string;
}

export const bookingsRepository = {
  findDetails: (id: string) => prisma.booking.findUniqueOrThrow({ where: { id }, include: bookingDetailsInclude }),

  listByCompany: (companyId: string) =>
    prisma.booking.findMany({
      where: { vessel: { companyId } },
      include: bookingDetailsInclude,
      orderBy: { createdAt: "desc" },
    }),

  // BookingStatus is a Postgres enum declared with PENDING first, so "asc" lists pending requests first.
  listByShipyard: (shipyardId: string) =>
    prisma.booking.findMany({
      where: { slot: { dock: { shipyardId } } },
      include: bookingDetailsInclude,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),

  listAll: (status?: BookingStatus) =>
    prisma.booking.findMany({ where: { status }, include: bookingDetailsInclude, orderBy: { createdAt: "desc" } }),

  findForCompany: (id: string, companyId: string) =>
    prisma.booking.findFirst({ where: { id, vessel: { companyId } }, select: { id: true, status: true } }),

  findForShipyard: (id: string, shipyardId: string, db: Db) =>
    db.booking.findFirst({
      where: { id, slot: { dock: { shipyardId } } },
      select: { id: true, status: true, slotId: true },
    }),

  hasActive: async (slotId: string, vesselId: string, db: Db) =>
    (await db.booking.count({ where: { slotId, vesselId, status: { in: ["PENDING", "ACCEPTED"] } } })) > 0,

  create: ({ serviceIds, ...data }: NewBooking, db: Db) =>
    db.booking.create({
      data: { ...data, services: { create: serviceIds.map((serviceId) => ({ serviceId })) } },
      select: { id: true },
    }),

  // Conditional update: only succeeds if the booking is still in the expected status.
  transition: async (id: string, from: BookingStatus, data: Prisma.BookingUpdateManyMutationInput, db: Db = prisma) =>
    (await db.booking.updateMany({ where: { id, status: from }, data })).count === 1,

  rejectOtherPending: (slotId: string, acceptedId: string, comment: string, decidedAt: Date, db: Db) =>
    db.booking.updateMany({
      where: { slotId, status: "PENDING", id: { not: acceptedId } },
      data: { status: "REJECTED", shipyardComment: comment, decidedAt },
    }),

  countByStatus: () => prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
};
