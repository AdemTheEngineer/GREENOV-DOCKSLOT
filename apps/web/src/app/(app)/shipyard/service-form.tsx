"use client";

import { useActionState } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import { createService } from "./actions";

export function ServiceForm() {
  const [state, action] = useActionState(createService, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="service-name" className={labelClass}>Nom</label>
        <input id="service-name" name="name" required placeholder="Polissage d'hélice" className={inputClass} />
      </div>
      <div>
        <label htmlFor="service-description" className={labelClass}>Description</label>
        <input id="service-description" name="description" className={inputClass} />
      </div>
      <div>
        <label htmlFor="service-price" className={labelClass}>Prix (EUR, facultatif)</label>
        <input id="service-price" name="priceEur" type="number" min="0" step="1" className={inputClass} />
      </div>
      <FormFeedback state={state} />
      <SubmitButton>Ajouter le service</SubmitButton>
    </form>
  );
}
