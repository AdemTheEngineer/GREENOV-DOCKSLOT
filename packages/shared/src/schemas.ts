import { z } from "zod";
import { bookingStatusSchema, decisionSchema } from "./enums";

// PostgreSQL TEXT cannot store U+0000: reject it here so it is a 400, not a database error.
const text = () =>
  z.string().refine((value) => !value.includes("\u0000"), "Le texte contient un caractère non autorisé.");
const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Identifiant invalide.");
const isoDate = z.iso.date();
const optionalText = (max: number) => text().trim().max(max).optional();

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createVesselSchema = z.object({
  name: text().trim().min(2).max(100),
  imo: z.string().trim().regex(/^\d{7}$/, "Le numéro IMO doit comporter exactement 7 chiffres."),
  type: text().trim().min(2).max(60),
  lengthM: z.number().positive().max(9999.99),
  beamM: z.number().positive().max(999.99),
  draftM: z.number().positive().max(99.99),
  grossTonnage: z.number().int().positive().max(1_000_000),
});
export type CreateVesselInput = z.infer<typeof createVesselSchema>;

const endAfterStart = "La date de fin doit être postérieure à la date de début.";

export const searchSlotsQuerySchema = z
  .object({ vesselId: id, port: text().trim().min(1).max(100), from: isoDate, to: isoDate })
  .refine((value) => value.to >= value.from, { message: endAfterStart, path: ["to"] });
export type SearchSlotsQuery = z.infer<typeof searchSlotsQuerySchema>;

export const createSlotSchema = z
  .object({ dockId: id, startDate: isoDate, endDate: isoDate })
  .refine((value) => value.endDate > value.startDate, {
    message: endAfterStart,
    path: ["endDate"],
  });
export type CreateSlotInput = z.infer<typeof createSlotSchema>;

export const createBookingSchema = z.object({
  slotId: id,
  vesselId: id,
  serviceIds: z.array(id).min(1, "Choisissez au moins un service.").max(20),
  notes: optionalText(1000),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const bookingDecisionSchema = z.object({
  decision: decisionSchema,
  comment: optionalText(500),
});
export type BookingDecisionInput = z.infer<typeof bookingDecisionSchema>;

export const adminBookingsQuerySchema = z.object({
  status: bookingStatusSchema.optional(),
});
export type AdminBookingsQuery = z.infer<typeof adminBookingsQuerySchema>;

export const createServiceSchema = z.object({
  name: text().trim().min(2).max(100),
  description: optionalText(500),
  priceEur: z.number().int().nonnegative().max(100_000_000).optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const idParamSchema = z.object({ id });
