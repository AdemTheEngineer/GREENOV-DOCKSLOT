import { prisma } from "../../lib/prisma";

export const shipyardsRepository = {
  distinctPorts: () =>
    prisma.shipyard.findMany({ distinct: ["port"], select: { port: true }, orderBy: { port: "asc" } }),
  listDocks: (shipyardId: string) => prisma.dock.findMany({ where: { shipyardId }, orderBy: { name: "asc" } }),
  findOwnedDock: (id: string, shipyardId: string) => prisma.dock.findFirst({ where: { id, shipyardId } }),
};
