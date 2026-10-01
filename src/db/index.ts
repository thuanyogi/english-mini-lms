import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy initialization — chỉ tạo client khi được gọi lần đầu.
// Điều này cho phép `npm run build` pass ngay cả khi thiếu DATABASE_URL.

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Vui lòng kiểm tra file .env.local.");
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

  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop];
  },
});
