"use client";

import type { DockDto } from "@dockslot/shared";
import { useActionState } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";
import { createSlot } from "./actions";

export function SlotForm({ docks }: { docks: DockDto[] }) {
  const [state, action] = useActionState(createSlot, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="slot-dock" className={labelClass}>Dock</label>
        {/* Keyed so the select remounts with the echoed value: React applies a select's defaultValue only on mount. */}
        <select key={state.fields?.dockId} id="slot-dock" name="dockId" required defaultValue={state.fields?.dockId ?? ""} className={inputClass}>
          <option value="" disabled>Choisir un dock</option>
          {docks.map((dock) => (
            <option key={dock.id} value={dock.id}>
              {dock.name} — {dock.maxLengthM} × {dock.maxBeamM} × {dock.maxDraftM} m
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="slot-start" className={labelClass}>Début</label>
          <input id="slot-start" type="date" name="startDate" required defaultValue={state.fields?.startDate} className={inputClass} />
        </div>
        <div>
          <label htmlFor="slot-end" className={labelClass}>Fin</label>
          <input id="slot-end" type="date" name="endDate" required defaultValue={state.fields?.endDate} className={inputClass} />
        </div>
      </div>
      <FormFeedback state={state} />
      <SubmitButton>Publier le créneau</SubmitButton>
    </form>
  );
}
