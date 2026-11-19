"use client";

import { useActionState } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import { createVessel } from "./actions";

const FIELDS = [
  { name: "name", label: "Nom du navire", placeholder: "Méridien Star", span: true },
  { name: "imo", label: "Numéro IMO", placeholder: "9400010", inputMode: "numeric" },
  { name: "type", label: "Type", placeholder: "Ferry ro-pax" },
  { name: "lengthM", label: "Longueur (m)", placeholder: "180", step: "0.01" },
  { name: "beamM", label: "Largeur (m)", placeholder: "30", step: "0.01" },
  { name: "draftM", label: "Tirant d'eau (m)", placeholder: "7", step: "0.01" },
  { name: "grossTonnage", label: "Jauge brute (GT)", placeholder: "30000", step: "1" },
] as const;

export function VesselForm() {
  const [state, action] = useActionState(createVessel, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.name} className={"span" in field ? "sm:col-span-2" : undefined}>
            <label htmlFor={`vessel-${field.name}`} className={labelClass}>{field.label}</label>
            <input
              id={`vessel-${field.name}`}
              name={field.name}
              required
              placeholder={field.placeholder}
              defaultValue={state.fields?.[field.name]}
              type={"step" in field ? "number" : "text"}
              step={"step" in field ? field.step : undefined}
              min={"step" in field ? "0" : undefined}
              inputMode={"inputMode" in field ? field.inputMode : undefined}
              className={inputClass}
            />
          </div>
        ))}
      </div>
      <FormFeedback state={state} />
      <SubmitButton>Ajouter le navire</SubmitButton>
    </form>
  );
}
