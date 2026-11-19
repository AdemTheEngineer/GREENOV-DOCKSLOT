"use client";

import type { ServiceDto } from "@dockslot/shared";
import { useActionState } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { requestSlot } from "../actions";

interface SlotRequestFormProps {
  slotId: string;
  vesselId: string;
  services: ServiceDto[];
}

export function SlotRequestForm({ slotId, vesselId, services }: SlotRequestFormProps) {
  const [state, action] = useActionState(requestSlot, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="vesselId" value={vesselId} />
      <fieldset>
        <legend className={labelClass}>Services souhaités</legend>
        <div className="space-y-1.5">
          {services.map((service) => (
            <label key={service.id} className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-slate-50">
              <input type="checkbox" name="serviceIds" value={service.id} className="mt-0.5 accent-accent" />
              <span className="flex-1">
                {service.name}
                {service.description && <span className="block text-xs text-slate-400">{service.description}</span>}
              </span>
              <span className="whitespace-nowrap text-xs font-semibold text-slate-600">{formatPrice(service.priceEur)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`notes-${slotId}`} className={labelClass}>Notes pour le chantier</label>
        <textarea id={`notes-${slotId}`} name="notes" rows={2} maxLength={1000} className={inputClass} placeholder="Travaux particuliers, contraintes d'arrivée…" />
      </div>
      <FormFeedback state={state} />
      <SubmitButton>Demander ce créneau</SubmitButton>
    </form>
  );
}
