import { Router } from "express";
import { requireRole } from "../../middlewares/auth";
import * as bookings from "../bookings/bookings.controller";
import * as shipyards from "../shipyards/shipyards.controller";
import * as slots from "../slots/slots.controller";
import * as yardServices from "../yard-services/yard-services.controller";

// Everything a shipyard user manages. Each service scopes queries to req.user.shipyardId.
export const shipyardRoutes = Router()
  .use(requireRole("SHIPYARD"))
  .get("/bookings", bookings.listForShipyard)
  .patch("/bookings/:id/decision", bookings.decide)
  .get("/slots", slots.listMine)
  .post("/slots", slots.create)
  .get("/services", yardServices.listMine)
  .post("/services", yardServices.create)
  .get("/docks", shipyards.myDocks);
