import { z } from "zod";

export const roleSchema = z.enum(["OWNER", "SHIPYARD", "ADMIN"]);
export type Role = z.infer<typeof roleSchema>;

export const slotStatusSchema = z.enum(["OPEN", "BOOKED"]);
export type SlotStatus = z.infer<typeof slotStatusSchema>;

export const bookingStatusSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export const BOOKING_STATUSES = bookingStatusSchema.options;

export const decisionSchema = z.enum(["ACCEPT", "REJECT"]);
export type Decision = z.infer<typeof decisionSchema>;
