const PLACEHOLDER = /^(?:REPLACE_ME|CHANGE_ME|YOUR_|DUMMY|PLACEHOLDER)/i;

export class EnvironmentError extends Error {
  constructor(variable: string) {
    super(`La variable de entorno ${variable} no está configurada correctamente.`);
    this.name = "EnvironmentError";
  }
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || PLACEHOLDER.test(value)) {
    throw new EnvironmentError(name);
  }
  return value;
}

export function databaseConfig(): {
  connectionString: string;
  max: number;
  ssl: { rejectUnauthorized: true } | undefined;
} {
  const connectionString = requiredEnv("DATABASE_URL");
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new EnvironmentError("DATABASE_URL");
  }

  let username: string;
  let password: string;
  try {
    username = decodeURIComponent(parsed.username);
    password = decodeURIComponent(parsed.password);
  } catch {
    throw new EnvironmentError("DATABASE_URL");
  }

  if (
    (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
    !parsed.hostname ||
    !username ||
    !password ||
    PLACEHOLDER.test(username) ||
    PLACEHOLDER.test(password)
  ) {
    throw new EnvironmentError("DATABASE_URL");
  }

  for (const parameter of [
    "ssl",
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "uselibpqcompat",
  ]) {
    parsed.searchParams.delete(parameter);
  }

  const maxValue = process.env.DATABASE_POOL_MAX;
  const max = maxValue === undefined ? 4 : Number(maxValue);
  if (!Number.isInteger(max) || max < 1 || max > 20) {
    throw new EnvironmentError("DATABASE_POOL_MAX");
  }

  const sslMode = process.env.DATABASE_SSL ?? "require";
  if (sslMode !== "disable" && sslMode !== "require") {
    throw new EnvironmentError("DATABASE_SSL");
  }
  if (process.env.NODE_ENV === "production" && sslMode !== "require") {
    throw new EnvironmentError("DATABASE_SSL");
  }

  return {
    connectionString: parsed.toString(),
    max,
    ssl: sslMode === "require" ? { rejectUnauthorized: true } : undefined,
  };
}
