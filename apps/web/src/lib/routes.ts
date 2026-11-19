import type { Role } from "@dockslot/shared";

const HOME: Record<Role, string> = { OWNER: "/owner", SHIPYARD: "/shipyard", ADMIN: "/admin" };

export const homeFor = (role: Role): string => HOME[role];
