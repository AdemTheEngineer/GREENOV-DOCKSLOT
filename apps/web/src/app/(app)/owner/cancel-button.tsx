"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { secondaryButtonClass } from "@/components/ui";
import { cancelBooking } from "./actions";

export function CancelButton({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(() => cancelBooking(bookingId), {});
  return (
    <form action={action}>
      <SubmitButton className={secondaryButtonClass}>Annuler</SubmitButton>
      {state.error && <p className="mt-1 max-w-48 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
