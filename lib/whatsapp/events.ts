import { createHash } from "node:crypto";

export type InboundEvent = {
  eventId: string;
  eventType: "message" | "status";
  payload: Record<string, unknown>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function extractInboundEvents(payload: unknown): InboundEvent[] {
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account") {
    return [];
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  const events: InboundEvent[] = [];

  for (const entry of entries) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      if (!isRecord(change) || !isRecord(change.value)) continue;
      const value = change.value;

      if (Array.isArray(value.messages)) {
        for (const message of value.messages) {
          if (
            !isRecord(message) ||
            !nonEmptyString(message.id) ||
            !nonEmptyString(message.from) ||
            !nonEmptyString(message.type)
          ) {
            continue;
          }

          const normalized: JsonRecord = {
            id: message.id,
            from: message.from,
            type: message.type,
          };
          if (nonEmptyString(message.timestamp)) normalized.timestamp = message.timestamp;

          if (message.type === "text" && isRecord(message.text)) {
            if (typeof message.text.body === "string") {
              normalized.text = { body: message.text.body };
            }
          }

          events.push({
            eventId: `message:${message.id}`,
            eventType: "message",
            payload: normalized,
          });
        }
      }

      if (Array.isArray(value.statuses)) {
        for (const status of value.statuses) {
          if (
            !isRecord(status) ||
            !nonEmptyString(status.id) ||
            !nonEmptyString(status.status) ||
            !nonEmptyString(status.timestamp)
          ) {
            continue;
          }

          const normalized: JsonRecord = {
            id: status.id,
            status: status.status,
            timestamp: status.timestamp,
          };
          if (nonEmptyString(status.recipient_id)) {
            normalized.recipient_id = status.recipient_id;
          }

          const eventId = createHash("sha256")
            .update(JSON.stringify(normalized))
            .digest("hex");
          events.push({
            eventId: `status:${eventId}`,
            eventType: "status",
            payload: normalized,
          });
        }
      }
    }
  }

  return events;
}
