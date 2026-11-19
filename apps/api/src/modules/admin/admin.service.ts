import { BOOKING_STATUSES, type AdminStatsDto } from "@dockslot/shared";
import { bookingsRepository } from "../bookings/bookings.repository";
import { slotsRepository } from "../slots/slots.repository";

export async function getStats(): Promise<AdminStatsDto> {
  const [bookingCounts, slotCounts] = await Promise.all([
    bookingsRepository.countByStatus(),
    slotsRepository.countByStatus(),
  ]);

  const bookings = Object.fromEntries(BOOKING_STATUSES.map((status) => [status, 0])) as AdminStatsDto["bookings"];
  for (const row of bookingCounts) bookings[row.status] = row._count._all;

  const slots: AdminStatsDto["slots"] = { OPEN: 0, BOOKED: 0 };
  for (const row of slotCounts) slots[row.status] = row._count._all;

  const totalBookings = Object.values(bookings).reduce((sum, count) => sum + count, 0);
  return { bookings, totalBookings, slots };
}
