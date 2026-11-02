// The database tests empty their tables. They run only against a database whose name ends in
// "_test" (hackr_test locally, in CI too), never the development database or Neon.
const url = process.env.DATABASE_URL ?? "";
const databaseName = url ? new URL(url).pathname.replace(/^\//, "") : "";

if (!databaseName.endsWith("_test")) {
  throw new Error(
    `The database tests reset their tables, so they need a database whose name ends in "_test"; got "${databaseName || "none"}". Run them with make test-db.`,
  );
}

export {};
