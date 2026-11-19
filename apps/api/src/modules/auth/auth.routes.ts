import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../../middlewares/auth";
import * as controller from "./auth.controller";

// Brute-force protection for credentials only: the session check (/me) runs on every page
// render from the Next.js server, so it must not share this budget. Built per app instance.
const loginRateLimit = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "TOO_MANY_REQUESTS", message: "Trop de tentatives, réessayez plus tard." } },
  });

export const createAuthRoutes = () =>
  Router()
    .post("/login", loginRateLimit(), controller.login)
    .post("/logout", controller.logout)
    .get("/me", requireAuth, controller.me);
