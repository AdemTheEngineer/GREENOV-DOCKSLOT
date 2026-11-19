import type { BookingDecisionInput, BookingDto, BookingStatus, CreateBookingInput } from "@dockslot/shared";
import { fitsInDock } from "../../lib/compatibility";
import { AppError, notFound } from "../../lib/errors";
import { toBookingDto } from "../../lib/mappers";
import { prisma } from "../../lib/prisma";
import { requireCompanyId, requireShipyardId } from "../../lib/tenancy";
import type { AuthUser } from "../../types/express";
import { slotsRepository } from "../slots/slots.repository";
import { vesselsRepository } from "../vessels/vessels.repository";
import { yardServicesRepository } from "../yard-services/yard-services.repository";
import { alreadyDecided, slotUnavailable, vesselIncompatible } from "./bookings.errors";
import { bookingsRepository } from "./bookings.repository";

const AUTO_REJECT_COMMENT = "Créneau attribué à une autre demande.";

const details = async (id: string) => toBookingDto(await bookingsRepository.findDetails(id));

export async function createBooking(user: AuthUser, input: CreateBookingInput): Promise<BookingDto> {
  const companyId = requireCompanyId(user);
  const serviceIds = [...new Set(input.serviceIds)];

  const { id } = await prisma.$transaction(async (tx) => {
    const vessel = await vesselsRepository.findOwned(input.vesselId, companyId, tx);
    if (!vessel) throw notFound("Navire introuvable.");

    // Share lock: a concurrent accept on this slot must finish before we read its status.
    const [locked] = await slotsRepository.lockForShare(input.slotId, tx);
    const slot = await slotsRepository.findWithDock(input.slotId, tx);
    if (!locked || !slot) throw notFound("Créneau introuvable.");
    if (slot.status !== "OPEN") throw slotUnavailable();
    if (!fitsInDock(vessel, slot.dock)) throw vesselIncompatible();

    if ((await yardServicesRepository.countOwned(serviceIds, slot.dock.shipyardId, tx)) !== serviceIds.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Un ou plusieurs services ne sont pas proposés par ce chantier.");
    }
    if (await bookingsRepository.hasActive(slot.id, vessel.id, tx)) {
      throw new AppError(409, "CONFLICT", "Ce navire a déjà une demande en cours sur ce créneau.");
    }

    return bookingsRepository.create(
      { slotId: slot.id, vesselId: vessel.id, requestedById: user.id, serviceIds, notes: input.notes || undefined },
      tx,
    );
  });
  return details(id);
}

export async function listMyBookings(user: AuthUser): Promise<BookingDto[]> {
  const bookings = await bookingsRepository.listByCompany(requireCompanyId(user));
  return bookings.map(toBookingDto);
}

export async function cancelBooking(user: AuthUser, bookingId: string): Promise<BookingDto> {
  const booking = await bookingsRepository.findForCompany(bookingId, requireCompanyId(user));
  if (!booking) throw notFound("Demande introuvable.");
  if (booking.status !== "PENDING" || !(await bookingsRepository.transition(booking.id, "PENDING", { status: "CANCELLED" }))) {
    throw alreadyDecided();
  }
  return details(booking.id);
}

export async function listShipyardBookings(user: AuthUser): Promise<BookingDto[]> {
  const bookings = await bookingsRepository.listByShipyard(requireShipyardId(user));
  return bookings.map(toBookingDto);
}

export async function decideBooking(user: AuthUser, bookingId: string, input: BookingDecisionInput): Promise<BookingDto> {
  const shipyardId = requireShipyardId(user);
  const decidedAt = new Date();
  const shipyardComment = input.comment || null;

  await prisma.$transaction(async (tx) => {
    // Scoping the lookup to my docks makes another shipyard's booking indistinguishable from a missing one.
    const booking = await bookingsRepository.findForShipyard(bookingId, shipyardId, tx);
    if (!booking) throw notFound("Demande introuvable.");
    if (booking.status !== "PENDING") throw alreadyDecided();

    if (input.decision === "REJECT") {
      const done = await bookingsRepository.transition(booking.id, "PENDING", { status: "REJECTED", shipyardComment, decidedAt }, tx);
      if (!done) throw alreadyDecided();
      return;
    }

    // Accept: FOR UPDATE serialises every accept (and new request) on this slot. Whoever
    // gets the lock second sees the slot BOOKED and fails cleanly. The partial unique
    // index bookings_one_accepted_per_slot is the backstop if this logic is ever bypassed.
    const [slot] = await slotsRepository.lockForUpdate(booking.slotId, tx);
    if (!slot || slot.status !== "OPEN") throw slotUnavailable();

    const accepted = await bookingsRepository.transition(booking.id, "PENDING", { status: "ACCEPTED", shipyardComment, decidedAt }, tx);
    if (!accepted) throw alreadyDecided();

    await slotsRepository.markBooked(booking.slotId, tx);
    await bookingsRepository.rejectOtherPending(booking.slotId, booking.id, AUTO_REJECT_COMMENT, decidedAt, tx);
  });
  return details(bookingId);
}

export async function listAllBookings(status?: BookingStatus): Promise<BookingDto[]> {
  const bookings = await bookingsRepository.listAll(status);
  return bookings.map(toBookingDto);
}
