import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

const client =
  globalForDb.postgresClient ??
  postgres(process.env.DATABASE_URL, {
    max: process.env.NODE_ENV === "production" ? 10 : 2,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });

