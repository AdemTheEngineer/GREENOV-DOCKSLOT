import type { ActionState } from "@/lib/actions";
import { Alert } from "./ui";

export function FormFeedback({ state }: { state: ActionState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}
