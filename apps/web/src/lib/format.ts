const DAY_MS = 86_400_000;

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
const priceFormat = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat("fr-FR");

/** Formats a calendar date ("YYYY-MM-DD") without timezone shifts. */
export const formatDate = (isoDate: string) => dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));
export const formatPrice = (eur: number | null) => (eur === null ? "Sur devis" : priceFormat.format(eur));
export const formatNumber = (value: number) => numberFormat.format(value);
export const formatMeters = (value: number) => `${numberFormat.format(value)} m`;

export const durationDays = (startDate: string, endDate: string) =>
  Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS);

export const isoDateFromToday = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
