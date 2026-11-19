// Slot dates are calendar days (Postgres DATE), handled as UTC midnight to avoid timezone drift.
export const parseIsoDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);
