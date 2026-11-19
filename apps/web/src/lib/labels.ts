import type { BookingStatus, Role } from "@dockslot/shared";

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Armateur",
  SHIPYARD: "Chantier naval",
  ADMIN: "Administrateur",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};
