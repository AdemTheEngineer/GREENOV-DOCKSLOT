"use server";

import { bookingDecisionSchema, createServiceSchema, createSlotSchema } from "@dockslot/shared";
import { revalidatePath } from "next/cache";
import { attempt, keepFields, numberField, text, validate, type ActionState } from "@/lib/actions";
import { api } from "@/lib/api";

export async function decideBooking(bookingId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = validate(
    bookingDecisionSchema,
    { decision: text(form, "decision"), comment: text(form, "comment") },
    { decision: "Décision", comment: "Commentaire" },
  );
  if ("error" in parsed) return parsed;

  const result = await attempt(() =>
    api(`/shipyard/bookings/${encodeURIComponent(bookingId)}/decision`, { method: "PATCH", body: parsed.data }),
  );
  revalidatePath("/shipyard");
  return result;
}

export async function createSlot(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = validate(
    createSlotSchema,
    { dockId: text(form, "dockId"), startDate: text(form, "startDate"), endDate: text(form, "endDate") },
    { dockId: "Dock", startDate: "Début", endDate: "Fin" },
  );
  if ("error" in parsed) return keepFields(parsed, form);

  const result = await attempt(() => api("/shipyard/slots", { method: "POST", body: parsed.data }), "Créneau publié.");
  revalidatePath("/shipyard");
  return keepFields(result, form);
}

export async function createService(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = validate(
    createServiceSchema,
    { name: text(form, "name"), description: text(form, "description"), priceEur: numberField(form, "priceEur") },
    { name: "Nom", description: "Description", priceEur: "Prix" },
  );
  if ("error" in parsed) return parsed;

  const result = await attempt(() => api("/shipyard/services", { method: "POST", body: parsed.data }), "Service ajouté.");
  revalidatePath("/shipyard");
  return result;
}
