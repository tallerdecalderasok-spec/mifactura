# Webhook de WhatsApp

## Descripción

[`route.ts`](../../app/api/whatsapp/route.ts) es el punto de entrada del webhook oficial de Meta. La ruta valida handshake/firma, normaliza mensajes y estados y escribe los eventos en Supabase PostgreSQL antes de responder `200`.

## Validaciones requeridas

- `GET`: validar handshake del webhook `hub.mode`, `hub.challenge`, `hub.verify_token`.
- `POST`: validar `X-Hub-Signature-256` con HMAC-SHA256 sobre el cuerpo raw.
- Revisar el payload para verificar que viene de Meta Cloud API.
- El procesamiento del mensaje y la autorización de usuario pertenecen al worker/flujo posterior; aún no se habilita emisión.

## Flujo recomendado

1. Leer el cuerpo en binario y construir el hash HMAC.
2. Comparar con la firma recibida.
3. Normalizar únicamente IDs, remitente, tipo, texto de texto entrante y estado; persistir en `inbound_events` con ID idempotente.
4. Responder `200` solo después de confirmar la aceptación durable del evento.
5. Derivar el procesamiento conversacional a un worker que pueda recuperarse después de reinicios.

## Consideraciones de idempotencia

- El `wa_message_id` debe usarse como clave de idempotencia.
- Los status events se guardan por una clave hash de sus campos normalizados y no se tratan como mensajes.
- El límite de cuerpo es 1 MB; la firma inválida no se parsea ni persiste.
- Si el mismo mensaje llega duplicado, no debe emitirse dos comprobantes.
- El sistema debe registrar el estado del pedido para evitar reintentos inconsistentes.

## Salida esperada

El webhook no debe devolver el resultado final del negocio en el mismo request si el proceso requiere más tiempo. Debe aceptar el evento de forma durable antes de responder y procesarlo luego con un mecanismo recuperable; una promesa en memoria o `after()` no se asumen como cola durable sin garantías verificadas del hosting.

Ver [spec de la Fase 2](../../spec/phases/phase-02-whatsapp-flow.md) para alcance y criterios de aceptación.

Las variables requeridas son `WA_VERIFY_TOKEN`, `WA_APP_SECRET` y `DATABASE_URL`; `DATABASE_SSL` exige TLS por defecto. `DATABASE_URL` es la URI PostgreSQL copiada desde **Connect** en Supabase, se mantiene solo en el servidor y su contraseña debe estar codificada si contiene caracteres reservados. Los valores `REPLACE_ME` del [ejemplo de entorno](../../.env.example) se rechazan. No se requiere ni se usa token de envío de Meta en este endpoint.
