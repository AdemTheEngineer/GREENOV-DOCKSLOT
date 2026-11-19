import "server-only";
import { AUTH_COOKIE_NAME, type ApiErrorBody } from "@dockslot/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
}

/** Server-side call to the Express API, forwarding the user's session cookie. */
export async function api<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const headers: Record<string, string> = {};
  if (token) headers.cookie = `${AUTH_COOKIE_NAME}=${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(503, "API_UNREACHABLE", "L'API DockSlot est injoignable. Vérifiez qu'elle est démarrée.");
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(response.status, error?.code ?? "UNKNOWN", error?.message ?? "Une erreur inattendue est survenue.");
  }
  return data as T;
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

/** For pages: returns an error message to display instead of throwing, and sends expired sessions to /login. */
export async function load<T>(path: string): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await api<T>(path) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    return { ok: false, error: error instanceof ApiError ? error.message : "Une erreur inattendue est survenue." };
  }
}
