import { persistInboundEvents } from "@/lib/whatsapp/inbox";
import { createWebhookHandlers } from "@/lib/whatsapp/webhook";

export const runtime = "nodejs";

const handlers = createWebhookHandlers({ persistInboundEvents });

export const GET = handlers.GET;
export const POST = handlers.POST;
