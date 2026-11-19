import type { CreateSlotInput, SearchSlotDto, SearchSlotsQuery, ShipyardSlotDto } from "@dockslot/shared";
import { parseIsoDate } from "../../lib/dates";
import { notFound } from "../../lib/errors";
import { toServiceDto, toSlotDto } from "../../lib/mappers";
import { requireCompanyId, requireShipyardId } from "../../lib/tenancy";
import type { AuthUser } from "../../types/express";
import { shipyardsRepository } from "../shipyards/shipyards.repository";
import { vesselsRepository } from "../vessels/vessels.repository";
import { slotsRepository } from "./slots.repository";

export async function searchSlots(user: AuthUser, query: SearchSlotsQuery): Promise<SearchSlotDto[]> {
  const vessel = await vesselsRepository.findOwned(query.vesselId, requireCompanyId(user));
  if (!vessel) throw notFound("Navire introuvable.");

  const slots = await slotsRepository.searchOpen({
    vessel,
    port: query.port,
    from: parseIsoDate(query.from),
    to: parseIsoDate(query.to),
  });
  return slots.map((slot) => ({
    ...toSlotDto(slot),
    services: slot.dock.shipyard.services.map(toServiceDto),
    pendingRequests: slot._count.bookings,
  }));
}

export async function listMySlots(user: AuthUser): Promise<ShipyardSlotDto[]> {
  const slots = await slotsRepository.listByShipyard(requireShipyardId(user));
  return slots.map((slot) => ({ ...toSlotDto(slot), pendingRequests: slot._count.bookings }));
}

export async function createSlot(user: AuthUser, input: CreateSlotInput): Promise<ShipyardSlotDto> {
  const dock = await shipyardsRepository.findOwnedDock(input.dockId, requireShipyardId(user));
  if (!dock) throw notFound("Dock introuvable.");

  // Overlaps are rejected by the slots_no_overlap constraint and mapped to 409 SLOT_OVERLAP.
  const slot = await slotsRepository.create({
    dockId: dock.id,
    startDate: parseIsoDate(input.startDate),
    endDate: parseIsoDate(input.endDate),
  });
  return { ...toSlotDto(slot), pendingRequests: slot._count.bookings };
}
