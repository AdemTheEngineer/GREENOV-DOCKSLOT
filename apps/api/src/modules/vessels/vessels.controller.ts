import { createVesselSchema } from "@dockslot/shared";
import type { Request, Response } from "express";
import { currentUser } from "../../middlewares/auth";
import * as vesselsService from "./vessels.service";

export async function list(req: Request, res: Response) {
  res.json({ vessels: await vesselsService.listVessels(currentUser(req)) });
}

export async function create(req: Request, res: Response) {
  const vessel = await vesselsService.createVessel(currentUser(req), createVesselSchema.parse(req.body));
  res.status(201).json({ vessel });
}
