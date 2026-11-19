-- Integrity rules that Prisma cannot express. The database is the last line of
-- defence: they hold even if two API requests race each other.

-- Needed so a GiST index can combine "=" on dock_id with "&&" on a date range.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE slots ADD CONSTRAINT slots_dates_check CHECK (end_date > start_date);

-- Two slots on the same dock can never overlap. daterange is half-open [start, end),
-- so a slot may start on the day the previous one ends.
ALTER TABLE slots ADD CONSTRAINT slots_no_overlap
  EXCLUDE USING gist (dock_id WITH =, daterange(start_date, end_date) WITH &&);

-- A slot is given to at most one booking.
CREATE UNIQUE INDEX bookings_one_accepted_per_slot ON bookings (slot_id) WHERE status = 'ACCEPTED';

-- A vessel cannot hold two active requests on the same slot.
CREATE UNIQUE INDEX bookings_one_active_per_vessel_slot ON bookings (slot_id, vessel_id)
  WHERE status IN ('PENDING','ACCEPTED');
