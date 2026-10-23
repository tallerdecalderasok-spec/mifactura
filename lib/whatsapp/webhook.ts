import { createHmac, timingSafeEqual } from "node:crypto";
import { EnvironmentError, requiredEnv } from "@/lib/env";
import { extractInboundEvents, type InboundEvent } from "@/lib/whatsapp/events";

const MAX_BODY_BYTES = 1_000_000;
const MAX_EVENTS = 500;

type WebhookDependencies = {
  persistInboundEvents: (events: InboundEvent[]) => Promise<void>;
};

class RequestBodyTooLargeError extends Error {}

async function readRequestBody(request: Request): Promise<Buffer> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function hasValidSignature(rawBody: Buffer, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !/^sha256=[a-f\d]{64}$/i.test(signatureHeader)) {
    return false;
  }

  const received = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return safeEqual(received, expected);
}

function configErrorResponse(error: unknown): Response | undefined {
  if (error instanceof EnvironmentError) {
    return Response.json({ error: "Webhook no configurado." }, { status: 503 });
  }
  return undefined;
}

export function createWebhookHandlers(dependencies: WebhookDependencies): {
  GET: (request: Request) => Response;
  POST: (request: Request) => Promise<Response>;
} {
  return {
    GET(request) {
      let verifyToken: string;
      try {
        verifyToken = requiredEnv("WA_VERIFY_TOKEN");
      } catch (error) {
        return configErrorResponse(error) ?? Response.json(
          { error: "Webhook no configurado." },
          { status: 503 },
        );
      }

      const params = new URL(request.url).searchParams;
      const mode = params.get("hub.mode");
      const token = params.get("hub.verify_token");
      const challenge = params.get("hub.challenge");

      if (
        mode !== "subscribe" ||
        !token ||
        !challenge ||
        !safeEqual(Buffer.from(token), Buffer.from(verifyToken))
      ) {
        return new Response("Forbidden", { status: 403 });
      }

      return new Response(challenge, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    },

    async POST(request) {
      let appSecret: string;
      try {
        appSecret = requiredEnv("WA_APP_SECRET");
      } catch (error) {
        return configErrorResponse(error) ?? Response.json(
          { error: "Webhook no configurado." },
          { status: 503 },
        );
      }

      try {
        const rawBody = await readRequestBody(request);
        if (!hasValidSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
          return new Response("Forbidden", { status: 403 });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBody));
        } catch {
          return Response.json({ error: "JSON inválido." }, { status: 400 });
        }

        const events = extractInboundEvents(payload);
        if (events.length > MAX_EVENTS) {
          return Response.json({ error: "Lote demasiado grande." }, { status: 413 });
        }

        if (events.length > 0) {
          await dependencies.persistInboundEvents(events);
        }

        return Response.json({ received: true });
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError) {
          return Response.json({ error: "Payload demasiado grande." }, { status: 413 });
        }
        console.error("No se pudo aceptar el evento del webhook.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return Response.json({ error: "No se pudo aceptar el evento." }, { status: 503 });
      }
    },
  };
}
