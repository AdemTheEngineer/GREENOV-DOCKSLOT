import { bookingDecisionSchema, createBookingSchema, idParamSchema } from "@dockslot/shared";
import type { Request, Response } from "express";
import { currentUser } from "../../middlewares/auth";
import * as bookingsService from "./bookings.service";

export async function create(req: Request, res: Response) {
  const booking = await bookingsService.createBooking(currentUser(req), createBookingSchema.parse(req.body));
  res.status(201).json({ booking });
}

export async function listMine(req: Request, res: Response) {
  res.json({ bookings: await bookingsService.listMyBookings(currentUser(req)) });
}

export async function cancel(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ booking: await bookingsService.cancelBooking(currentUser(req), id) });
}

export async function listForShipyard(req: Request, res: Response) {
  res.json({ bookings: await bookingsService.listShipyardBookings(currentUser(req)) });
}

export async function decide(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const input = bookingDecisionSchema.parse(req.body);
  res.json({ booking: await bookingsService.decideBooking(currentUser(req), id, input) });
}
