import "server-only";
import { AUTH_COOKIE_NAME, type Role, type UserDto } from "@dockslot/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api, ApiError } from "./api";
import { homeFor } from "./routes";

export const getCurrentUser = cache(async (): Promise<UserDto | null> => {
  if (!(await cookies()).has(AUTH_COOKIE_NAME)) return null;
  try {
    return (await api<{ user: UserDto }>("/auth/me")).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/** Sends the visitor to the right page for their role. The API still checks the role on every call. */
export async function requireRole(role: Role): Promise<UserDto> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}
