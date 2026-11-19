import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/config/env";

const exampleSecret = /JWT_SECRET="([^"]+)"/.exec(readFileSync(new URL("../.env.example", import.meta.url), "utf8"))?.[1];
const base = { DATABASE_URL: "postgresql://localhost/db", PORT: "4000" };

describe("environment validation [F-003]", () => {
  it("refuses the public .env.example secret in production", () => {
    expect(exampleSecret).toBeDefined();
    expect(() => parseEnv({ ...base, NODE_ENV: "production", JWT_SECRET: exampleSecret })).toThrow(/JWT_SECRET/);
  });

  it("refuses a short secret in production", () => {
    expect(() => parseEnv({ ...base, NODE_ENV: "production", JWT_SECRET: "only-twenty-chars-xx" })).toThrow(/JWT_SECRET/);
  });

  it("accepts a long random secret in production", () => {
    const env = parseEnv({ ...base, NODE_ENV: "production", JWT_SECRET: "k3Vq9xZ2pL7mN4rT8wY1bC6dF0gH5jK2sA9eU3iO" });
    expect(env.NODE_ENV).toBe("production");
  });

  it("keeps the example secret usable for local development", () => {
    expect(parseEnv({ ...base, NODE_ENV: "development", JWT_SECRET: exampleSecret }).NODE_ENV).toBe("development");
  });
});
