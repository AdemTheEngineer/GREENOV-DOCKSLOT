import type { CreateServiceInput, ServiceDto } from "@dockslot/shared";
import { toServiceDto } from "../../lib/mappers";
import { requireShipyardId } from "../../lib/tenancy";
import type { AuthUser } from "../../types/express";
import { yardServicesRepository } from "./yard-services.repository";

export async function listMyServices(user: AuthUser): Promise<ServiceDto[]> {
  const services = await yardServicesRepository.listByShipyard(requireShipyardId(user));
  return services.map(toServiceDto);
}

export async function createService(user: AuthUser, input: CreateServiceInput): Promise<ServiceDto> {
  return toServiceDto(await yardServicesRepository.create(requireShipyardId(user), input));
}
