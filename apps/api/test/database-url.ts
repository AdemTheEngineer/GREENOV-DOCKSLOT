// Tests never touch the development database.
export const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://dockslot:dockslot@localhost:5433/dockslot_test?schema=public";
