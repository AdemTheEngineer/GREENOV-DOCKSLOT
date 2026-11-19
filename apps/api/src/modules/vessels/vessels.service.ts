import type { CreateVesselInput, VesselDto } from "@dockslot/shared";
import { AppError } from "../../lib/errors";
import { toVesselDto } from "../../lib/mappers";
import { requireCompanyId } from "../../lib/tenancy";
import type { AuthUser } from "../../types/express";
import { vesselsRepository } from "./vessels.repository";

export async function listVessels(user: AuthUser): Promise<VesselDto[]> {
  const vessels = await vesselsRepository.listByCompany(requireCompanyId(user));
  return vessels.map(toVesselDto);
}

export async function createVessel(user: AuthUser, input: CreateVesselInput): Promise<VesselDto> {
  const companyId = requireCompanyId(user);
  if (await vesselsRepository.findByImo(input.imo)) {
    throw new AppError(409, "CONFLICT", "Un navire avec ce numéro IMO est déjà enregistré.");
  }
  return toVesselDto(await vesselsRepository.create(companyId, input));
}
