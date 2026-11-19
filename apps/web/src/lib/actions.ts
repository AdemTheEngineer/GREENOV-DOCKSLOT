import "server-only";
import type { z } from "zod";
import { ApiError } from "./api";

export interface ActionState {
  error?: string;
  success?: string;
  /** Submitted values, echoed back on error because React resets the form after an action. */
  fields?: Record<string, string>;
}

export function keepFields(state: ActionState, form: FormData): ActionState {
  if (!state.error) return state;
  const fields = Object.fromEntries([...form].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  return { ...state, fields };
}

export const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
};

export const numberField = (form: FormData, key: string) => {
  const value = text(form, key);
  return value === undefined ? undefined : Number(value.replace(",", "."));
};

/** Validates with the shared schema so the user sees the same rules the API enforces. */
export function validate<T extends z.ZodType>(
  schema: T,
  input: unknown,
  labels: Record<string, string>,
): { data: z.infer<T> } | { error: string } {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data };
  const messages = result.error.issues.map((issue) => {
    const label = labels[String(issue.path[0])];
    return label ? `${label} : ${issue.message}` : issue.message;
  });
  return { error: [...new Set(messages)].join(" · ") };
}

/** Runs an API mutation and turns API errors into a message for the form. */
export async function attempt(run: () => Promise<unknown>, success?: string): Promise<ActionState> {
  try {
    await run();
    return { success };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}
