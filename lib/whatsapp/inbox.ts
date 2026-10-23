import { getPool } from "@/lib/db/pool";
import type { InboundEvent } from "@/lib/whatsapp/events";

export async function persistInboundEvents(events: InboundEvent[]): Promise<void> {
  if (events.length === 0) return;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const event of events) {
      await client.query(
        `INSERT INTO inbound_events (event_id, event_type, payload)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (event_id) DO NOTHING`,
        [event.eventId, event.eventType, JSON.stringify(event.payload)],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
