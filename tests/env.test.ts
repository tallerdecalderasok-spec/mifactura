import assert from "node:assert/strict";
import test from "node:test";
import { databaseConfig, EnvironmentError } from "../lib/env";

function withDatabaseEnv(
  values: Record<string, string>,
  run: () => void,
): void {
  const names = ["DATABASE_URL", "DATABASE_SSL", "DATABASE_POOL_MAX", "NODE_ENV"];
  const previous = new Map(names.map((name) => [name, process.env[name]]));

  for (const name of names) {
    delete process.env[name];
  }
  Object.assign(process.env, values);

  try {
    run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("la base Supabase usa TLS por defecto y un pool acotado", () => {
  withDatabaseEnv(
    { DATABASE_URL: "postgresql://postgres:local-test@db.example.supabase.co:5432/postgres" },
    () => {
      const config = databaseConfig();
      assert.equal(config.max, 4);
      assert.deepEqual(config.ssl, { rejectUnauthorized: true });
    },
  );
});

test("la configuración de prueba puede desactivar TLS en una base local", () => {
  withDatabaseEnv(
    {
      DATABASE_URL: "postgresql://postgres:local-test@localhost:54322/postgres",
      DATABASE_SSL: "disable",
      NODE_ENV: "test",
    },
    () => assert.equal(databaseConfig().ssl, undefined),
  );
});

test("la URL no puede anular las opciones TLS definidas por la aplicación", () => {
  withDatabaseEnv(
    {
      DATABASE_URL:
        "postgresql://postgres:local-test@db.example.supabase.co:5432/postgres?sslmode=no-verify&uselibpqcompat=true",
    },
    () => {
      const config = databaseConfig();
      assert.deepEqual(config.ssl, { rejectUnauthorized: true });
      assert.equal(config.connectionString.includes("sslmode"), false);
      assert.equal(config.connectionString.includes("uselibpqcompat"), false);
    },
  );
});

test("rechaza credenciales ficticias y URI con codificación inválida", () => {
  withDatabaseEnv(
    { DATABASE_URL: "postgresql://postgres:REPLACE_ME@db.example.supabase.co:5432/postgres" },
    () => assert.throws(databaseConfig, EnvironmentError),
  );

  withDatabaseEnv(
    { DATABASE_URL: "postgresql://postgres:%ZZ@localhost:5432/postgres" },
    () => assert.throws(databaseConfig, EnvironmentError),
  );
});

test("producción no permite desactivar TLS", () => {
  withDatabaseEnv(
    {
      DATABASE_URL: "postgresql://postgres:local-test@db.example.supabase.co:5432/postgres",
      DATABASE_SSL: "disable",
      NODE_ENV: "production",
    },
    () => assert.throws(databaseConfig, EnvironmentError),
  );
});
