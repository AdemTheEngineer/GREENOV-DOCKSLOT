"use client";

import { useActionState } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { SubmitButton } from "@/components/submit-button";
import { inputClass } from "@/components/ui";
import { decideBooking } from "./actions";

export function DecisionForm({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(decideBooking.bind(null, bookingId), {});
  return (
    <form action={action} className="space-y-2">
      <textarea name="comment" rows={2} maxLength={500} placeholder="Commentaire pour l'armateur (facultatif)" className={inputClass} />
      <FormFeedback state={state} />
      <div className="flex gap-2">
        <SubmitButton name="decision" value="ACCEPT" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
          Accepter
        </SubmitButton>
        <SubmitButton name="decision" value="REJECT" className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60">
          Refuser
        </SubmitButton>
      </div>
    </form>
  );
}
