import type { UserDto } from "@dockslot/shared";
import { logout } from "@/app/actions";
import { ROLE_LABELS } from "@/lib/labels";
import { NavLinks } from "./nav-links";

const NAV: Record<UserDto["role"], { href: string; label: string }[]> = {
  OWNER: [
    { href: "/owner", label: "Mes demandes" },
    { href: "/owner/search", label: "Rechercher un créneau" },
  ],
  SHIPYARD: [{ href: "/shipyard", label: "Tableau de bord" }],
  ADMIN: [{ href: "/admin", label: "Supervision" }],
};

export function Header({ user }: { user: UserDto }) {
  return (
    <header className="bg-navy text-white shadow">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
        <span className="text-lg font-bold tracking-tight">
          ⚓ Dock<span className="text-accent">Slot</span>
        </span>
        <NavLinks links={NAV[user.role]} />
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-slate-300">{ROLE_LABELS[user.role]}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-white/30 px-3 py-1.5 text-sm transition hover:bg-white/10"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
