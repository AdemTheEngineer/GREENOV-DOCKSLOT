import { redirect } from "next/navigation";
import { homeFor } from "@/lib/routes";
import { getCurrentUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? homeFor(user.role) : "/login");
}
