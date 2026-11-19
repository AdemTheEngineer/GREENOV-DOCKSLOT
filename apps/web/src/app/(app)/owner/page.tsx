import type { BookingDto, VesselDto } from "@dockslot/shared";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Alert, Card, EmptyState, PageHeader, primaryButtonClass, Table, Td } from "@/components/ui";
import { load } from "@/lib/api";
import { formatDate, formatMeters, formatNumber } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { CancelButton } from "./cancel-button";
import { VesselForm } from "./vessel-form";

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  await requireRole("OWNER");
  const { created } = await searchParams;
  const [bookings, vessels] = await Promise.all([
    load<{ bookings: BookingDto[] }>("/bookings/mine"),
    load<{ vessels: VesselDto[] }>("/vessels"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Espace armateur" subtitle="Suivez vos demandes de carénage et gérez votre flotte." />
        <Link href="/owner/search" className={primaryButtonClass}>Rechercher un créneau</Link>
      </div>
      {created && <Alert tone="success">Votre demande a bien été envoyée au chantier. Elle est en attente de validation.</Alert>}

      <Card title="Mes demandes">
        {!bookings.ok ? (
          <Alert tone="error">{bookings.error}</Alert>
        ) : bookings.data.bookings.length === 0 ? (
          <EmptyState title="Aucune demande pour le moment." hint="Recherchez un créneau disponible pour l'un de vos navires." />
        ) : (
          <Table head={["Navire", "Chantier / dock", "Dates", "Services", "Statut", "Commentaire du chantier", ""]}>
            {bookings.data.bookings.map((booking) => (
              <tr key={booking.id}>
                <Td className="font-medium text-navy">{booking.vessel.name}</Td>
                <Td>
                  <p className="font-medium">{booking.slot.shipyard.name}</p>
                  <p className="text-xs text-slate-500">{booking.slot.shipyard.port} · {booking.slot.dock.name}</p>
                </Td>
                <Td className="whitespace-nowrap">{formatDate(booking.slot.startDate)} → {formatDate(booking.slot.endDate)}</Td>
                <Td>
                  <ul className="list-inside list-disc text-xs text-slate-600">
                    {booking.services.map((service) => <li key={service.id}>{service.name}</li>)}
                  </ul>
                </Td>
                <Td><StatusBadge status={booking.status} /></Td>
                <Td className="text-slate-600">{booking.shipyardComment ?? "—"}</Td>
                <Td>{booking.status === "PENDING" && <CancelButton bookingId={booking.id} />}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card title="Ma flotte">
            {!vessels.ok ? (
              <Alert tone="error">{vessels.error}</Alert>
            ) : vessels.data.vessels.length === 0 ? (
              <EmptyState title="Aucun navire enregistré." hint="Ajoutez votre premier navire avec le formulaire." />
            ) : (
              <Table head={["Navire", "IMO", "L × l × TE", "Jauge"]}>
                {vessels.data.vessels.map((vessel) => (
                  <tr key={vessel.id}>
                    <Td>
                      <p className="font-medium text-navy">{vessel.name}</p>
                      <p className="text-xs text-slate-500">{vessel.type}</p>
                    </Td>
                    <Td className="font-mono text-xs">{vessel.imo}</Td>
                    <Td className="whitespace-nowrap">
                      {formatMeters(vessel.lengthM)} × {formatMeters(vessel.beamM)} × {formatMeters(vessel.draftM)}
                    </Td>
                    <Td className="whitespace-nowrap">{formatNumber(vessel.grossTonnage)} GT</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card title="Ajouter un navire" description="Les dimensions servent à filtrer les docks compatibles.">
            <VesselForm />
          </Card>
        </div>
      </div>
    </div>
  );
}
