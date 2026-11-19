import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_PASSWORD, seedDatabase } from "../prisma/seed-data";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

beforeAll(() => seedDatabase(prisma));
afterAll(() => prisma.$disconnect());

describe("auth rate limiting [F-001]", () => {
  it("never rate-limits the session check made on every page render", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/v1/auth/login").send({ email: "armateur@demo.fr", password: DEMO_PASSWORD }).expect(200);

    const statuses = [];
    for (let i = 0; i < 60; i++) statuses.push((await agent.get("/api/v1/auth/me")).status);

    expect(new Set(statuses)).toEqual(new Set([200]));
  });

  it("does not count successful logins", async () => {
    const app = createApp();
    for (let i = 0; i < 25; i++) {
      await request(app).post("/api/v1/auth/login").send({ email: "admin@demo.fr", password: DEMO_PASSWORD }).expect(200);
    }
  });

  it("blocks an IP after repeated failed logins, with the uniform error shape", async () => {
    const app = createApp();
    const attempt = () => request(app).post("/api/v1/auth/login").send({ email: "nobody@demo.fr", password: "wrong" });
    for (let i = 0; i < 20; i++) expect((await attempt()).status).toBe(401);

    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: { code: "TOO_MANY_REQUESTS", message: "Trop de tentatives, réessayez plus tard." } });
  });
});
