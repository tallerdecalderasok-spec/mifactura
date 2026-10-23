import { getPool } from "@/lib/db/pool";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    await getPool().query("SELECT 1");
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Health check de base de datos no disponible.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
