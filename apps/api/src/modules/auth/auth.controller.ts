import { loginSchema } from "@dockslot/shared";
import type { Request, Response } from "express";
import { currentUser } from "../../middlewares/auth";
import * as authService from "./auth.service";
import { AUTH_COOKIE, authCookieOptions, tokenMaxAgeMs } from "./auth.token";

export async function login(req: Request, res: Response) {
  const { user, token } = await authService.login(loginSchema.parse(req.body));
  res.cookie(AUTH_COOKIE, token, { ...authCookieOptions, maxAge: tokenMaxAgeMs });
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, authCookieOptions);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  res.json({ user: await authService.getProfile(currentUser(req).id) });
}
