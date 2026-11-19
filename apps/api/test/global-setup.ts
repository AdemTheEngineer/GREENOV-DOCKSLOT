import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "./database-url";

export default function setup() {
  // migrate deploy creates the test database if needed and applies pending migrations.
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "ignore",
  });
}
