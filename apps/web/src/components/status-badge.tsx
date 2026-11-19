import type { BookingStatus } from "@dockslot/shared";
import { BOOKING_STATUS_LABELS } from "@/lib/labels";

const STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 ring-amber-200",
  ACCEPTED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  REJECTED: "bg-red-100 text-red-800 ring-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STYLES[status]}`}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}
