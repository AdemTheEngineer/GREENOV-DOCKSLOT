import { Router } from "express";
import { requireRole } from "../../middlewares/auth";
import * as controller from "./admin.controller";

export const adminRoutes = Router()
  .use(requireRole("ADMIN"))
  .get("/bookings", controller.bookings)
  .get("/stats", controller.stats);
