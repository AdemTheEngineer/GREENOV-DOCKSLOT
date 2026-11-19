import { BOOKING_STATUSES, bookingStatusSchema, type AdminStatsDto, type BookingDto } from "@dockslot/shared";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Alert, Card, EmptyState, PageHeader, Table, Td } from "@/components/ui";
import { load } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/labels";
import { requireRole } from "@/lib/session";

function Kpi({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}

const KPI_ACCENTS = {
  PENDING: "border-amber-400",
  ACCEPTED: "border-emerald-500",
  REJECTED: "border-red-500",
  CANCELLED: "border-slate-400",
} as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("ADMIN");
  const parsedStatus = bookingStatusSchema.safeParse((await searchParams).status);
  const status = parsedStatus.success ? parsedStatus.data : undefined;
  const [stats, bookings] = await Promise.all([
    load<{ stats: AdminStatsDto }>("/admin/stats"),
    load<{ bookings: BookingDto[] }>(`/admin/bookings${status ? `?status=${status}` : ""}`),
  ]);

  const filters = [{ value: undefined, label: "Toutes" }, ...BOOKING_STATUSES.map((value) => ({ value, label: BOOKING_STATUS_LABELS[value] }))];

  return (
    <div className="space-y-6">
      <PageHeader title="Supervision" subtitle="Toutes les demandes de la plateforme et leurs indicateurs." />

      {!stats.ok ? (
        <Alert tone="error">{stats.error}</Alert>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          {BOOKING_STATUSES.map((value) => (
            <Kpi key={value} label={BOOKING_STATUS_LABELS[value]} value={stats.data.stats.bookings[value]} accent={KPI_ACCENTS[value]} />
          ))}
          <Kpi label="Total demandes" value={stats.data.stats.totalBookings} accent="border-navy" />
          <Kpi label="Créneaux ouverts" value={stats.data.stats.slots.OPEN} accent="border-accent" />
          <Kpi label="Créneaux réservés" value={stats.data.stats.slots.BOOKED} accent="border-navy-light" />
        </div>
      )}

      <Card title="Demandes">
        <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtrer par statut">
          {filters.map((filter) => (
            <Link
              key={filter.label}
              href={filter.value ? `/admin?status=${filter.value}` : "/admin"}
              className={`rounded-full px-3 py-1 text-sm transition ${status === filter.value ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
        {!bookings.ok ? (
          <Alert tone="error">{bookings.error}</Alert>
        ) : bookings.data.bookings.length === 0 ? (
          <EmptyState title="Aucune demande ne correspond à ce filtre." />
        ) : (
          <Table head={["Créée le", "Navire", "Demandeur", "Chantier / dock", "Créneau", "Statut"]}>
            {bookings.data.bookings.map((booking) => (
              <tr key={booking.id}>
                <Td className="whitespace-nowrap text-slate-500">{formatDateTime(booking.createdAt)}</Td>
                <Td className="font-medium text-navy">{booking.vessel.name}</Td>
                <Td>{booking.requestedBy.name}</Td>
                <Td>
                  <p>{booking.slot.shipyard.name}</p>
                  <p className="text-xs text-slate-500">{booking.slot.shipyard.port} · {booking.slot.dock.name}</p>
                </Td>
                <Td className="whitespace-nowrap">{formatDate(booking.slot.startDate)} → {formatDate(booking.slot.endDate)}</Td>
                <Td><StatusBadge status={booking.status} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
