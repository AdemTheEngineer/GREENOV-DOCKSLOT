import type { BookingStatus, Role, SlotStatus } from "./enums";

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  shipyardId: string | null;
}

export interface VesselDto {
  id: string;
  name: string;
  imo: string;
  type: string;
  lengthM: number;
  beamM: number;
  draftM: number;
  grossTonnage: number;
}

export interface ShipyardDto {
  id: string;
  name: string;
  port: string;
  country: string;
}

export interface DockDto {
  id: string;
  name: string;
  maxLengthM: number;
  maxBeamM: number;
  maxDraftM: number;
}

export interface ServiceDto {
  id: string;
  name: string;
  description: string | null;
  priceEur: number | null;
}

export interface SlotDto {
  id: string;
  startDate: string;
  endDate: string;
  status: SlotStatus;
  dock: DockDto;
  shipyard: ShipyardDto;
}

export interface SearchSlotDto extends SlotDto {
  services: ServiceDto[];
  pendingRequests: number;
}

export interface ShipyardSlotDto extends SlotDto {
  pendingRequests: number;
}

export interface BookingDto {
  id: string;
  status: BookingStatus;
  notes: string | null;
  shipyardComment: string | null;
  createdAt: string;
  decidedAt: string | null;
  vessel: VesselDto;
  slot: SlotDto;
  services: ServiceDto[];
  requestedBy: { id: string; name: string; email: string };
}

export interface AdminStatsDto {
  bookings: Record<BookingStatus, number>;
  totalBookings: number;
  slots: Record<SlotStatus, number>;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
