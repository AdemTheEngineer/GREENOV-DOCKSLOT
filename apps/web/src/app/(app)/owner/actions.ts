"use server";

import { createBookingSchema, createVesselSchema } from "@dockslot/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { attempt, keepFields, numberField, text, validate, type ActionState } from "@/lib/actions";
import { api } from "@/lib/api";

const VESSEL_LABELS = {
  name: "Nom",
  imo: "IMO",
  type: "Type",
  lengthM: "Longueur",
  beamM: "Largeur",
  draftM: "Tirant d'eau",
  grossTonnage: "Jauge brute",
};

export async function createVessel(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = validate(
    createVesselSchema,
    {
      name: text(form, "name"),
      imo: text(form, "imo"),
      type: text(form, "type"),
      lengthM: numberField(form, "lengthM"),
      beamM: numberField(form, "beamM"),
      draftM: numberField(form, "draftM"),
      grossTonnage: numberField(form, "grossTonnage"),
    },
    VESSEL_LABELS,
  );
  if ("error" in parsed) return keepFields(parsed, form);

  const result = await attempt(() => api("/vessels", { method: "POST", body: parsed.data }), "Navire ajouté à votre flotte.");
  revalidatePath("/owner");
  return keepFields(result, form);
}

export async function cancelBooking(bookingId: string): Promise<ActionState> {
  const result = await attempt(() => api(`/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: "PATCH" }));
  revalidatePath("/owner");
  return result;
}

export async function requestSlot(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = validate(
    createBookingSchema,
    {
      slotId: text(form, "slotId"),
      vesselId: text(form, "vesselId"),
      serviceIds: form.getAll("serviceIds").filter((value) => typeof value === "string"),
      notes: text(form, "notes"),
    },
    { serviceIds: "Services", notes: "Notes" },
  );
  if ("error" in parsed) return parsed;

  const result = await attempt(() => api("/bookings", { method: "POST", body: parsed.data }));
  if (result.error) return result;
  revalidatePath("/owner");
  redirect("/owner?created=1");
}
