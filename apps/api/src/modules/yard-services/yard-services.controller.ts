import { createServiceSchema } from "@dockslot/shared";
import type { Request, Response } from "express";
import { currentUser } from "../../middlewares/auth";
import * as yardServicesService from "./yard-services.service";

export async function listMine(req: Request, res: Response) {
  res.json({ services: await yardServicesService.listMyServices(currentUser(req)) });
}

export async function create(req: Request, res: Response) {
  const service = await yardServicesService.createService(currentUser(req), createServiceSchema.parse(req.body));
  res.status(201).json({ service });
}
