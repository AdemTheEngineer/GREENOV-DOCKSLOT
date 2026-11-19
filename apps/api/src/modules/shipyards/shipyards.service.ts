import type { DockDto } from "@dockslot/shared";
import { toDockDto } from "../../lib/mappers";
import { requireShipyardId } from "../../lib/tenancy";
import type { AuthUser } from "../../types/express";
import { shipyardsRepository } from "./shipyards.repository";

export async function listPorts(): Promise<string[]> {
  const rows = await shipyardsRepository.distinctPorts();
  return rows.map((row) => row.port);
}

export async function listMyDocks(user: AuthUser): Promise<DockDto[]> {
  const docks = await shipyardsRepository.listDocks(requireShipyardId(user));
  return docks.map(toDockDto);
}
