import type { Role } from "@dockslot/shared";
import type { Request, RequestHandler } from "express";
import { forbidden, unauthenticated } from "../lib/errors";
import { AUTH_COOKIE, verifyToken } from "../modules/auth/auth.token";
import type { AuthUser } from "../types/express";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  const user = typeof token === "string" ? verifyToken(token) : null;
  if (!user) return next(unauthenticated());
  req.user = user;
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthenticated());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthenticated();
  return req.user;
}
