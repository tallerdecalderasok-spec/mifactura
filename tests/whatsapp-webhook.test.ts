import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createWebhookHandlers } from "../lib/whatsapp/webhook";

const secret = "test-secret-only-for-unit-tests";
const verifyToken = "verify-token-test-only";

function signedRequest(body: string, signatureBody = body): Request {
  const signature = createHmac("sha256", secret).update(signatureBody).digest("hex");
  return new Request("https://example.test/api/whatsapp", {
    method: "POST",
    headers: { "x-hub-signature-256": `sha256=${signature}` },
    body,
  });
}

test("GET acepta el handshake y devuelve el challenge como texto", async () => {
  process.env.WA_VERIFY_TOKEN = verifyToken;
  const handlers = createWebhookHandlers({ persistInboundEvents: async () => {} });
  const response = handlers.GET(
    new Request(
      `https://example.test/api/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=12345`,
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "12345");
});

test("GET rechaza un token incorrecto o parámetros incompletos", () => {
  process.env.WA_VERIFY_TOKEN = verifyToken;
  const handlers = createWebhookHandlers({ persistInboundEvents: async () => {} });
  const badToken = handlers.GET(
    new Request("https://example.test/api/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1"),
  );
  const missing = handlers.GET(new Request("https://example.test/api/whatsapp"));
  assert.equal(badToken.status, 403);
  assert.equal(missing.status, 403);
});

test("POST verifica la firma raw antes de persistir mensajes", async () => {
  process.env.WA_APP_SECRET = secret;
  const persisted: unknown[] = [];
  const handlers = createWebhookHandlers({
    persistInboundEvents: async (events) => {
      persisted.push(...events);
    },
  });
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        value: {
          messages: [
            { id: "wamid.1", from: "5491112345678", type: "text", text: { body: "hola" } },
            { id: "wamid.2", from: "5491112345678", type: "image" },
          ],
        },
      }],
    }],
  });

  const response = await handlers.POST(signedRequest(body));
  assert.equal(response.status, 200);
  assert.equal(persisted.length, 2);
});

test("POST rechaza firma ausente, inválida y cuerpo alterado sin persistir", async () => {
  process.env.WA_APP_SECRET = secret;
  let calls = 0;
  const handlers = createWebhookHandlers({
    persistInboundEvents: async () => {
      calls += 1;
    },
  });
  const body = '{"object":"whatsapp_business_account","entry":[]}';
  const unsigned = await handlers.POST(
    new Request("https://example.test/api/whatsapp", { method: "POST", body }),
  );
  const modified = await handlers.POST(signedRequest(`${body} `, body));

  assert.equal(unsigned.status, 403);
  assert.equal(modified.status, 403);
  assert.equal(calls, 0);
});

test("POST rechaza JSON malformado firmado", async () => {
  process.env.WA_APP_SECRET = secret;
  const handlers = createWebhookHandlers({ persistInboundEvents: async () => {} });
  const response = await handlers.POST(signedRequest("{"));
  assert.equal(response.status, 400);
});

test("POST separa los status y deduplica IDs estables", async () => {
  process.env.WA_APP_SECRET = secret;
  const events: { eventId: string; eventType: string }[] = [];
  const handlers = createWebhookHandlers({
    persistInboundEvents: async (incoming) => {
      events.push(...incoming);
    },
  });
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        value: {
          statuses: [{ id: "wamid.sent", status: "delivered", timestamp: "1710000000" }],
        },
      }],
    }],
  });
  const response = await handlers.POST(signedRequest(body));

  assert.equal(response.status, 200);
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "status");
  assert.match(events[0].eventId, /^status:/);
});

test("POST no devuelve 200 si falla la persistencia durable", async () => {
  process.env.WA_APP_SECRET = secret;
  const handlers = createWebhookHandlers({
    persistInboundEvents: async () => {
      throw new Error("database unavailable");
    },
  });
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        value: { messages: [{ id: "wamid.fail", from: "5491112345678", type: "text" }] },
      }],
    }],
  });

  const response = await handlers.POST(signedRequest(body));
  assert.equal(response.status, 503);
});
