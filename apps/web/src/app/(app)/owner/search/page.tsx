import type { SearchSlotDto, VesselDto } from "@dockslot/shared";
import { Alert, Card, EmptyState, inputClass, labelClass, PageHeader, primaryButtonClass } from "@/components/ui";
import { load, type Loaded } from "@/lib/api";
import { durationDays, formatDate, formatMeters, isoDateFromToday } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { SlotRequestForm } from "./slot-request-form";

interface SearchParams {
  vesselId?: string;
  port?: string;
  from?: string;
  to?: string;
}

function groupByShipyard(slots: SearchSlotDto[]) {
  const groups = new Map<string, { shipyard: SearchSlotDto["shipyard"]; slots: SearchSlotDto[] }>();
  for (const slot of slots) {
    const group = groups.get(slot.shipyard.id) ?? { shipyard: slot.shipyard, slots: [] };
    group.slots.push(slot);
    groups.set(slot.shipyard.id, group);
  }
  return [...groups.values()];
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("OWNER");
  const params = await searchParams;
  const [vessels, ports] = await Promise.all([
    load<{ vessels: VesselDto[] }>("/vessels"),
    load<{ ports: string[] }>("/ports"),
  ]);

  const { vesselId, port } = params;
  const from = params.from ?? isoDateFromToday(0);
  const to = params.to ?? isoDateFromToday(90);
  const results: Loaded<{ slots: SearchSlotDto[] }> | null =
    vesselId && port ? await load(`/slots/search?${new URLSearchParams({ vesselId, port, from, to })}`) : null;
  const vessel = vessels.ok ? vessels.data.vessels.find((v) => v.id === vesselId) : undefined;
  const loadError = !vessels.ok ? vessels.error : !ports.ok ? ports.error : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Rechercher un créneau" subtitle="Seuls les docks compatibles avec les dimensions du navire sont proposés." />

      <Card>
        {!vessels.ok || !ports.ok ? (
          <Alert tone="error">{loadError}</Alert>
        ) : vessels.data.vessels.length === 0 ? (
          <EmptyState title="Ajoutez d'abord un navire à votre flotte." />
        ) : (
          <form method="get" className="grid gap-4 md:grid-cols-5 md:items-end">
            <div className="md:col-span-2">
              <label htmlFor="vesselId" className={labelClass}>Navire</label>
              <select id="vesselId" name="vesselId" required defaultValue={vesselId ?? ""} className={inputClass}>
                <option value="" disabled>Choisir un navire</option>
                {vessels.data.vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {formatMeters(v.lengthM)} × {formatMeters(v.beamM)} × {formatMeters(v.draftM)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="port" className={labelClass}>Port</label>
              <select id="port" name="port" required defaultValue={port ?? ""} className={inputClass}>
                <option value="" disabled>Choisir un port</option>
                {ports.data.ports.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="from" className={labelClass}>Début entre le</label>
              <input id="from" type="date" name="from" required defaultValue={from} className={inputClass} />
            </div>
            <div>
              <label htmlFor="to" className={labelClass}>et le</label>
              <input id="to" type="date" name="to" required defaultValue={to} className={inputClass} />
            </div>
            <div className="md:col-span-5">
              <button type="submit" className={primaryButtonClass}>Rechercher</button>
            </div>
          </form>
        )}
      </Card>

      {results && !results.ok && <Alert tone="error">{results.error}</Alert>}
      {results?.ok && results.data.slots.length === 0 && (
        <EmptyState
          title="Aucun créneau compatible sur cette période."
          hint="Élargissez la fenêtre de dates ou essayez un autre port."
        />
      )}
      {results?.ok && vessel &&
        groupByShipyard(results.data.slots).map(({ shipyard, slots }) => (
          <Card key={shipyard.id} title={shipyard.name} description={`${shipyard.port}, ${shipyard.country} · ${slots.length} créneau(x) compatible(s) pour ${vessel.name}`}>
            <div className="grid gap-4 md:grid-cols-2">
              {slots.map((slot) => (
                <article key={slot.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-navy">{slot.dock.name}</p>
                      <p className="text-xs text-slate-500">
                        Max {formatMeters(slot.dock.maxLengthM)} × {formatMeters(slot.dock.maxBeamM)} × {formatMeters(slot.dock.maxDraftM)}
                      </p>
                    </div>
                    {slot.pendingRequests > 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200">
                        {slot.pendingRequests} demande(s) en attente
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm">
                    <span className="font-medium">{formatDate(slot.startDate)} → {formatDate(slot.endDate)}</span>
                    <span className="text-slate-500"> · {durationDays(slot.startDate, slot.endDate)} jours</span>
                  </p>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <SlotRequestForm slotId={slot.id} vesselId={vessel.id} services={slot.services} />
                  </div>
                </article>
              ))}
            </div>
          </Card>
        ))}
    </div>
  );
}
