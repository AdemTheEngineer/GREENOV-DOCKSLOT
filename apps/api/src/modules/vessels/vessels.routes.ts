import { Router } from "express";
import { requireRole } from "../../middlewares/auth";
import * as controller from "./vessels.controller";

export const vesselsRoutes = Router().use(requireRole("OWNER")).get("/", controller.list).post("/", controller.create);
