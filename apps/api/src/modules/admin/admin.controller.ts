import { adminBookingsQuerySchema } from "@dockslot/shared";
import type { Request, Response } from "express";
import * as bookingsService from "../bookings/bookings.service";
import * as adminService from "./admin.service";

export async function bookings(req: Request, res: Response) {
  const { status } = adminBookingsQuerySchema.parse(req.query);
  res.json({ bookings: await bookingsService.listAllBookings(status) });
}

export async function stats(_req: Request, res: Response) {
  res.json({ stats: await adminService.getStats() });
}
