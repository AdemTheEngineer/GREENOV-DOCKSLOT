import type { BookingDto, DockDto, ServiceDto, ShipyardDto, SlotDto, UserDto, VesselDto } from "@dockslot/shared";
import type { Dock, Service, Shipyard, User, Vessel } from "@prisma/client";
import { toIsoDate } from "./dates";
import type { BookingDetails, SlotDetails } from "./includes";

export const toUserDto = (user: User): UserDto => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  companyId: user.companyId,
  shipyardId: user.shipyardId,
});

export const toVesselDto = (vessel: Vessel): VesselDto => ({
  id: vessel.id,
  name: vessel.name,
  imo: vessel.imo,
  type: vessel.type,
  lengthM: vessel.lengthM.toNumber(),
  beamM: vessel.beamM.toNumber(),
  draftM: vessel.draftM.toNumber(),
  grossTonnage: vessel.grossTonnage,
});

export const toShipyardDto = (shipyard: Shipyard): ShipyardDto => ({
  id: shipyard.id,
  name: shipyard.name,
  port: shipyard.port,
  country: shipyard.country,
});

export const toDockDto = (dock: Dock): DockDto => ({
  id: dock.id,
  name: dock.name,
  maxLengthM: dock.maxLengthM.toNumber(),
  maxBeamM: dock.maxBeamM.toNumber(),
  maxDraftM: dock.maxDraftM.toNumber(),
});

export const toServiceDto = (service: Service): ServiceDto => ({
  id: service.id,
  name: service.name,
  description: service.description,
  priceEur: service.priceEur,
});

export const toSlotDto = (slot: SlotDetails): SlotDto => ({
  id: slot.id,
  startDate: toIsoDate(slot.startDate),
  endDate: toIsoDate(slot.endDate),
  status: slot.status,
  dock: toDockDto(slot.dock),
  shipyard: toShipyardDto(slot.dock.shipyard),
});

export const toBookingDto = (booking: BookingDetails): BookingDto => ({
  id: booking.id,
  status: booking.status,
  notes: booking.notes,
  shipyardComment: booking.shipyardComment,
  createdAt: booking.createdAt.toISOString(),
  decidedAt: booking.decidedAt?.toISOString() ?? null,
  vessel: toVesselDto(booking.vessel),
  slot: toSlotDto(booking.slot),
  services: booking.services.map(({ service }) => toServiceDto(service)),
  requestedBy: booking.requestedBy,
});
