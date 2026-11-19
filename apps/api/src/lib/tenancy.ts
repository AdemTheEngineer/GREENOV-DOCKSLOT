import type { AuthUser } from "../types/express";
import { forbidden } from "./errors";

export function requireCompanyId(user: AuthUser): string {
  if (user.role !== "OWNER" || !user.companyId) throw forbidden();
  return user.companyId;
}

export function requireShipyardId(user: AuthUser): string {
  if (user.role !== "SHIPYARD" || !user.shipyardId) throw forbidden();
  return user.shipyardId;
}
