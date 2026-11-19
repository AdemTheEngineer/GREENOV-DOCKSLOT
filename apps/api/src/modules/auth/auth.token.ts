import { AUTH_COOKIE_NAME, roleSchema } from "@dockslot/shared";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env, isProduction } from "../../config/env";
import type { AuthUser } from "../../types/express";

export const AUTH_COOKIE = AUTH_COOKIE_NAME;
const TOKEN_TTL_SECONDS = 8 * 60 * 60;
export const tokenMaxAgeMs = TOKEN_TTL_SECONDS * 1000;

// TODO: replace the single 8 h token with a short-lived access token and a rotating refresh token.
export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
} as const;

const payloadSchema = z.object({
  sub: z.string(),
  role: roleSchema,
  companyId: z.string().nullable(),
  shipyardId: z.string().nullable(),
});

export function signToken(user: AuthUser): string {
  const claims = { role: user.role, companyId: user.companyId, shipyardId: user.shipyardId };
  return jwt.sign(claims, env.JWT_SECRET, { subject: user.id, expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = payloadSchema.parse(jwt.verify(token, env.JWT_SECRET));
    return { id: payload.sub, role: payload.role, companyId: payload.companyId, shipyardId: payload.shipyardId };
  } catch {
    return null;
  }
}
