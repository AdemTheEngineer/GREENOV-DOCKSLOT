import type { CreateServiceInput } from "@dockslot/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const yardServicesRepository = {
  listByShipyard: (shipyardId: string) =>
    prisma.service.findMany({ where: { shipyardId }, orderBy: { name: "asc" } }),
  countOwned: (ids: string[], shipyardId: string, db: Prisma.TransactionClient) =>
    db.service.count({ where: { id: { in: ids }, shipyardId } }),
  create: (shipyardId: string, input: CreateServiceInput) => prisma.service.create({ data: { ...input, shipyardId } }),
};
