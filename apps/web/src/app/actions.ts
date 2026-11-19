"use server";

import { AUTH_COOKIE_NAME } from "@dockslot/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export async function logout() {
  await api("/auth/logout", { method: "POST" }).catch(() => undefined);
  (await cookies()).delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
