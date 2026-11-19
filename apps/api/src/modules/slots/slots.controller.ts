import { createSlotSchema, searchSlotsQuerySchema } from "@dockslot/shared";
import type { Request, Response } from "express";
import { currentUser } from "../../middlewares/auth";
import * as slotsService from "./slots.service";

export async function search(req: Request, res: Response) {
  res.json({ slots: await slotsService.searchSlots(currentUser(req), searchSlotsQuerySchema.parse(req.query)) });
}

export async function listMine(req: Request, res: Response) {
  res.json({ slots: await slotsService.listMySlots(currentUser(req)) });
}

export async function create(req: Request, res: Response) {
  const slot = await slotsService.createSlot(currentUser(req), createSlotSchema.parse(req.body));
  res.status(201).json({ slot });
}
