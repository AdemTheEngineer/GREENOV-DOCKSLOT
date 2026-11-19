import type { CreateVesselInput } from "@dockslot/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const vesselsRepository = {
  listByCompany: (companyId: string) => prisma.vessel.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  findOwned: (id: string, companyId: string, db: Prisma.TransactionClient = prisma) =>
    db.vessel.findFirst({ where: { id, companyId } }),
  findByImo: (imo: string) => prisma.vessel.findUnique({ where: { imo } }),
  create: (companyId: string, input: CreateVesselInput) => prisma.vessel.create({ data: { ...input, companyId } }),
};
