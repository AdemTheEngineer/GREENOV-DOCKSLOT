import type { BookingDto, DockDto, ServiceDto, ShipyardSlotDto } from "@dockslot/shared";
import { StatusBadge } from "@/components/status-badge";
import { Alert, Card, EmptyState, PageHeader, Table, Td } from "@/components/ui";
import { load } from "@/lib/api";
import { durationDays, formatDate, formatDateTime, formatMeters, formatNumber, formatPrice } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { DecisionForm } from "./decision-form";
import { ServiceForm } from "./service-form";
import { SlotForm } from "./slot-form";

function BookingCard({ booking }: { booking: BookingDto }) {
  const { vessel, slot } = booking;
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy">{vessel.name} <span className="font-mono text-xs text-slate-400">IMO {vessel.imo}</span></p>
          <p className="text-xs text-slate-500">
            {vessel.type} · {formatMeters(vessel.lengthM)} × {formatMeters(vessel.beamM)} × {formatMeters(vessel.draftM)} · {formatNumber(vessel.grossTonnage)} GT
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Créneau</dt>
          <dd>{slot.dock.name} · {formatDate(slot.startDate)} → {formatDate(slot.endDate)} ({durationDays(slot.startDate, slot.endDate)} j)</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Demandé par</dt>
          <dd>{booking.requestedBy.name} · {formatDateTime(booking.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Services demandés</dt>
          <dd>{booking.services.map((service) => service.name).join(", ")}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Notes de l&apos;armateur</dt>
          <dd className="text-slate-600">{booking.notes ?? "—"}</dd>
        </div>
        {booking.shipyardComment && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Votre commentaire</dt>
            <dd className="text-slate-600">{booking.shipyardComment}</dd>
          </div>
        )}
      </dl>
      {booking.status === "PENDING" && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <DecisionForm bookingId={booking.id} />
        </div>
      )}
    </article>
  );
}

export default async function ShipyardPage() {
  await requireRole("SHIPYARD");
  const [bookings, slots, services, docks] = await Promise.all([
    load<{ bookings: BookingDto[] }>("/shipyard/bookings"),
    load<{ slots: ShipyardSlotDto[] }>("/shipyard/slots"),
    load<{ services: ServiceDto[] }>("/shipyard/services"),
    load<{ docks: DockDto[] }>("/shipyard/docks"),
  ]);
  const shipyardName = slots.ok ? slots.data.slots[0]?.shipyard.name : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title={shipyardName ?? "Espace chantier"} subtitle="Traitez les demandes reçues et publiez vos créneaux et services." />

      <Card title="Demandes reçues" description="Accepter une demande réserve le créneau et refuse automatiquement les autres demandes en attente.">
        {!bookings.ok ? (
          <Alert tone="error">{bookings.error}</Alert>
        ) : bookings.data.bookings.length === 0 ? (
          <EmptyState title="Aucune demande reçue pour l'instant." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {bookings.data.bookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Créneaux">
            {!slots.ok ? (
              <Alert tone="error">{slots.error}</Alert>
            ) : slots.data.slots.length === 0 ? (
              <EmptyState title="Aucun créneau publié." hint="Publiez un créneau avec le formulaire." />
            ) : (
              <Table head={["Dock", "Dates", "Durée", "Statut", "Demandes en attente"]}>
                {slots.data.slots.map((slot) => (
                  <tr key={slot.id}>
                    <Td className="font-medium">{slot.dock.name}</Td>
                    <Td className="whitespace-nowrap">{formatDate(slot.startDate)} → {formatDate(slot.endDate)}</Td>
                    <Td>{durationDays(slot.startDate, slot.endDate)} j</Td>
                    <Td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${slot.status === "OPEN" ? "bg-sky-100 text-sky-800" : "bg-navy text-white"}`}>
                        {slot.status === "OPEN" ? "Disponible" : "Réservé"}
                      </span>
                    </Td>
                    <Td>{slot.pendingRequests}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
        <Card title="Nouveau créneau" description="Deux créneaux d'un même dock ne peuvent pas se chevaucher.">
          {docks.ok ? <SlotForm docks={docks.data.docks} /> : <Alert tone="error">{docks.error}</Alert>}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Services">
            {!services.ok ? (
              <Alert tone="error">{services.error}</Alert>
            ) : services.data.services.length === 0 ? (
              <EmptyState title="Aucun service publié." />
            ) : (
              <Table head={["Service", "Description", "Prix"]}>
                {services.data.services.map((service) => (
                  <tr key={service.id}>
                    <Td className="font-medium">{service.name}</Td>
                    <Td className="text-slate-600">{service.description ?? "—"}</Td>
                    <Td className="whitespace-nowrap">{formatPrice(service.priceEur)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
        <Card title="Nouveau service">
          <ServiceForm />
        </Card>
      </div>
    </div>
  );
}
