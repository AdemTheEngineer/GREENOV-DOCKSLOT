import { Router } from "express";
import { requireRole } from "../../middlewares/auth";
import * as controller from "./bookings.controller";

export const bookingsRoutes = Router()
  .use(requireRole("OWNER"))
  .post("/", controller.create)
  .get("/mine", controller.listMine)
  .patch("/:id/cancel", controller.cancel);
