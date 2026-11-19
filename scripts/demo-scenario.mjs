// End-to-end demo scenario through the Next.js proxy (single origin), as a browser would.
// Usage: npm run dev (in another terminal), then `npm run e2e`. Run `npm run db:seed` first for a clean state.
const BASE = process.env.WEB_URL ?? "http://localhost:3000";

async function call(cookie, method, path, body) {
  const response = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${JSON.stringify(data)}`);
  return { data, setCookie: response.headers.get("set-cookie") };
}

async function login(email) {
  const { data, setCookie } = await call(null, "POST", "/auth/login", { email, password: "demo1234" });
  return { cookie: setCookie.split(";")[0], user: data.user };
}

const step = (n, text) => console.log(`\n${n}. ${text}`);
const assert = (condition, message) => {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`   ✔ ${message}`);
};

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const window = { from: iso(today), to: iso(new Date(today.getTime() + 90 * 86_400_000)) };

step(1, "Owner logs in and searches Marseille for Méridien Express");
const owner = await login("armateur@demo.fr");
assert(owner.user.role === "OWNER", "armateur@demo.fr is an OWNER");
const { data: fleet } = await call(owner.cookie, "GET", "/vessels");
const express = fleet.vessels.find((v) => v.imo === "9400001");
const cargo = fleet.vessels.find((v) => v.imo === "9400002");
const query = (vesselId) => new URLSearchParams({ vesselId, port: "Marseille", ...window });
const { data: found } = await call(owner.cookie, "GET", `/slots/search?${query(express.id)}`);
assert(found.slots.length > 0, `${found.slots.length} compatible slot(s) found`);
const { data: cargoFound } = await call(owner.cookie, "GET", `/slots/search?${query(cargo.id)}`);
assert(cargoFound.slots.every((s) => s.dock.name === "Forme 10"), "Méridien Cargo only sees the large dock (Forme 10)");

step(2, "Owner requests a slot with 2 services");
const slot = found.slots[0];
const serviceIds = slot.services.slice(0, 2).map((s) => s.id);
const { data: created } = await call(owner.cookie, "POST", "/bookings", { slotId: slot.id, vesselId: express.id, serviceIds, notes: "Demande e2e" });
assert(created.booking.status === "PENDING" && created.booking.services.length === 2, "booking created as PENDING with 2 services");

step(3, "Shipyard (Marseille) logs in and accepts it");
const shipyard = await login("chantier@demo.fr");
const { data: inbox } = await call(shipyard.cookie, "GET", "/shipyard/bookings");
assert(inbox.bookings.some((b) => b.id === created.booking.id), "request visible in the shipyard inbox");
const { data: decided } = await call(shipyard.cookie, "PATCH", `/shipyard/bookings/${created.booking.id}/decision`, { decision: "ACCEPT", comment: "Bienvenue à Marseille." });
assert(decided.booking.status === "ACCEPTED" && decided.booking.slot.status === "BOOKED", "booking ACCEPTED and slot BOOKED");

step(4, "Owner sees the booking as accepted");
const { data: mine } = await call(owner.cookie, "GET", "/bookings/mine");
assert(mine.bookings.find((b) => b.id === created.booking.id)?.status === "ACCEPTED", "owner sees « Acceptée »");

step(5, "Admin sees the updated counters");
const admin = await login("admin@demo.fr");
const { data: stats } = await call(admin.cookie, "GET", "/admin/stats");
console.log("   ", JSON.stringify(stats.stats));
assert(stats.stats.bookings.ACCEPTED >= 1 && stats.stats.slots.BOOKED >= 1, "admin counters include the accepted booking and booked slot");

console.log("\nScenario completed successfully.");
