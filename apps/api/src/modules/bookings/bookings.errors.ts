import { AppError } from "../../lib/errors";

export const slotUnavailable = () => new AppError(409, "SLOT_UNAVAILABLE", "Ce créneau n'est plus disponible.");

export const alreadyDecided = () =>
  new AppError(409, "ALREADY_DECIDED", "Cette demande a déjà été traitée et ne peut plus être modifiée.");

export const vesselIncompatible = () =>
  new AppError(422, "VESSEL_INCOMPATIBLE", "Ce navire dépasse les dimensions maximales du dock (longueur, largeur ou tirant d'eau).");
