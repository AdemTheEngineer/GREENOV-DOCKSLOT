import type { Request, Response } from "express";
import { currentUser } from "../../middlewares/auth";
import * as shipyardsService from "./shipyards.service";

export async function ports(_req: Request, res: Response) {
  res.json({ ports: await shipyardsService.listPorts() });
}

export async function myDocks(req: Request, res: Response) {
  res.json({ docks: await shipyardsService.listMyDocks(currentUser(req)) });
}
