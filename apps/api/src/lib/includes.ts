import type { Prisma } from "@prisma/client";

export const slotDetailsInclude = {
  dock: { include: { shipyard: true } },
} satisfies Prisma.SlotInclude;

export const bookingDetailsInclude = {
  vessel: true,
  slot: { include: slotDetailsInclude },
  services: { include: { service: true }, orderBy: { service: { name: "asc" } } },
  requestedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.BookingInclude;

export const pendingCount = {
  _count: { select: { bookings: { where: { status: "PENDING" } } } },
} satisfies Prisma.SlotInclude;

export type SlotDetails = Prisma.SlotGetPayload<{ include: typeof slotDetailsInclude }>;
export type BookingDetails = Prisma.BookingGetPayload<{ include: typeof bookingDetailsInclude }>;
