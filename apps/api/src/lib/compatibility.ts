import type { Dock, Vessel } from "@prisma/client";

type Hull = Pick<Vessel, "lengthM" | "beamM" | "draftM">;
type DockLimits = Pick<Dock, "maxLengthM" | "maxBeamM" | "maxDraftM">;

// Business rule 1: the vessel must physically fit in the dock on all three dimensions.
export const fitsInDock = (vessel: Hull, dock: DockLimits): boolean =>
  vessel.lengthM.lte(dock.maxLengthM) && vessel.beamM.lte(dock.maxBeamM) && vessel.draftM.lte(dock.maxDraftM);
