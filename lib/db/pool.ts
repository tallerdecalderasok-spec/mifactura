import { Pool } from "pg";
import { databaseConfig } from "@/lib/env";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(databaseConfig());
  }
  return pool;
}
