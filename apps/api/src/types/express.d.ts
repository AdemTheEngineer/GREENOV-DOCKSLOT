import type { Role } from "@dockslot/shared";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthUser {
  id: string;
  role: Role;
  companyId: string | null;
  shipyardId: string | null;
}
