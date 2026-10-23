# Arquitectura del sistema

## Vista general

```text
WhatsApp ──► Meta Cloud API ──► app/api/whatsapp/route.ts
                                     │
                                     ├─ valida firma HMAC
                                     ├─ persiste inbox de forma durable
                                     └─ responde 200 tras el commit
                                                 │
                                                 ▼
                                        Worker durable
                                        lib/parse.ts
                                        lib/bot.ts
                                        lib/emitir.ts
                                        lib/arca.ts
                                        lib/whatsapp.ts
                                                 │
                                                 ├─ Supabase PostgreSQL (conexión solo desde servidor)
                                                 └─ ARCA / Afip SDK (WSAA + WSFEv1)
```

## Responsabilidades por capa

### Capa HTTP (`app/`)

- Recepción del webhook de WhatsApp.
- Verificación del handshake del webhook.
- Validación de firma y payload.
- Exposición de rutas públicas para comprobantes.

### Capa de negocio (`lib/`)

- Parsing del mensaje del usuario.
- Lógica de flujo: solicitud, confirmación, cancelación y emisión.
- Integración con Afip SDK/ARCA.
- Envío de mensajes y generación de comprobantes.

### Capa de persistencia (`supabase/`, `lib/db/`)

- Registro de usuarios autorizados.
- Relación entre usuarios y emisores.
- Registro de pedidos y estados.
- Control de idempotencia y numeración.
- Inbox/outbox durables para recuperación y estado de mensajes.
- Migraciones y pruebas locales mediante Supabase CLI; tablas públicas con RLS y sin grants directos a `anon`/`authenticated`.
- La aplicación conecta al PostgreSQL de Supabase desde Node.js con `DATABASE_URL`; no usa `service_role` ni expone claves Supabase al navegador.

## Reglas de diseño clave

- Cada factura se emite con el CUIT del técnico autorizado.
- El sistema solo procesa mensajes desde teléfonos autorizados.
- La confirmación previa es obligatoria antes del envío a ARCA.
- Cada pedido debe ser idempotente por `wa_message_id`.
- El punto de venta debe ser exclusivo para el bot para evitar desfase de numeración.

## Consideraciones de operación

- Los tiempos de respuesta a ARCA pueden ser largos; la ruta debe aceptar el evento durablemente y el worker debe procesarlo fuera del request.
- La integración debe soportar estados `PENDIENTE`, `EN_PROCESO`, `EMITIDA`, `RECHAZADA`, `DUDOSA`, `CANCELADA`.
- La validación del receptor (`CondicionIVAReceptorId`) debe respetar la normativa vigente y la RG 5616/2024.

La [especificación por fases](../spec/README.md) define el alcance canónico y los criterios de aceptación.
