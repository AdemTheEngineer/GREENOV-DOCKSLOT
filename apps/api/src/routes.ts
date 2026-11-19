import { Router } from "express";
import { requireAuth, requireRole } from "./middlewares/auth";
import { adminRoutes } from "./modules/admin/admin.routes";
import { createAuthRoutes } from "./modules/auth/auth.routes";
import { bookingsRoutes } from "./modules/bookings/bookings.routes";
import * as shipyards from "./modules/shipyards/shipyards.controller";
import { shipyardRoutes } from "./modules/shipyard/shipyard.routes";
import * as slots from "./modules/slots/slots.controller";
import { vesselsRoutes } from "./modules/vessels/vessels.routes";

export const createApiRouter = () =>
  Router()
    .use("/auth", createAuthRoutes())
    .use(requireAuth)
    .get("/ports", shipyards.ports)
    .get("/slots/search", requireRole("OWNER"), slots.search)
    .use("/vessels", vesselsRoutes)
    .use("/bookings", bookingsRoutes)
    .use("/shipyard", shipyardRoutes)
    .use("/admin", adminRoutes);
