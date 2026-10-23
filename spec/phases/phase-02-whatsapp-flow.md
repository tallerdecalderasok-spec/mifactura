# Fase 2 — WhatsApp y flujo conversacional

**Estado:** T07 iniciado; T08–T10 pendientes. Depende de [Fase 1](./phase-01-foundation.md) y de la gramática aprobada en T01.  
**Tareas:** T07–T10 del [roadmap](../implementation-plan.md).  
**Reglas comunes:** [especificación general](../project-spec.md).

## Objetivo

Recibir eventos oficiales de Meta de forma autenticada y durable, y completar el flujo del pedido sin pérdida, duplicación ni emisión antes de confirmar.

## T07 — Webhook de Meta

### Alcance

- GET handshake con verificación exacta del token.
- POST firmado: validar HMAC sobre cuerpo raw antes de JSON.
- Validar estructura/tamaño y procesar lotes defensivamente.
- Separar mensajes entrantes de notificaciones de estado.
- Persistir evento idempotente antes de confirmar recepción a Meta.

### Criterios de aceptación

- Tests cubren handshake, firma válida/incorrecta/ausente, cuerpo alterado y JSON malformado.
- Firma inválida no crea eventos de negocio ni genera respuesta de bot.
- Duplicados no crean trabajo duplicado.
- Respuesta positiva solo ocurre después del commit durable.
- Status events no se interpretan como mensajes de usuario.

## T08 — Worker y outbox durables

### Alcance

- Reclamar y procesar eventos con el mecanismo durable elegido.
- Preservar orden causal por solicitante y permitir paralelismo entre solicitantes.
- Guardar errores normalizados, reintentos recuperables, backoff y redrive restringido.
- Enviar mensajes mediante outbox y registrar IDs/estados de Meta.

### Criterios de aceptación

- Worker reiniciado recupera eventos aceptados.
- Mensaje `solicitud` seguido inmediatamente de `SI` no sufre carreras de procesamiento.
- Error de Graph API se detecta y comunica; HTTP aceptado no se confunde con entrega.
- Resultado incierto de envío no produce retry ciego de mensajes críticos.

## T09 — Parser y dominio del pedido

**Precondición:** gramática, importes y requisitos fiscales definidos en T01.

### Alcance

- Parsear solo la gramática acordada, sin lenguaje libre.
- Validar montos decimales, límites, datos del receptor, condición fiscal y emisor.
- Separar el dominio de WhatsApp y devolver errores funcionales seguros.

### Criterios de aceptación

- Casos válidos, inválidos, ambiguos y límites tienen pruebas.
- No se altera silenciosamente la interpretación del monto.
- Reglas y códigos fiscales son trazables a documentación oficial vigente.

## T10 — Conversación, confirmación y cancelación

### Alcance

- Verificar solicitante y permisos de emisor en servidor.
- Crear pedido pendiente idempotente y enviar resumen que distingue emisor y receptor.
- Vincular `SI` y `NO` a pedido vigente, propietario y expiración.
- Enviar ayuda, errores, resultados y estado incierto por outbox.

### Criterios de aceptación

- `SI` solo confirma pedido pendiente y vigente del solicitante.
- `NO` cancela solo un pedido todavía cancelable.
- Confirmación duplicada, expirada o posterior a estado terminal no llega a ARCA.
- Usuario desconocido o emisor no asignado no crea pedido ni llama a servicio fiscal.
- Mensaje ante `DUDOSA` indica espera/verificación y no pide repetir factura.

## Salida de fase

Flujo probado con adaptador fiscal simulado; webhook aceptado durablemente en entorno de prueba; aún sin emisión real.

## No incluye

Llamar ARCA desde el Route Handler; usar WhatsApp Web u otra automatización no oficial; tratar status events como mensajes entrantes.

## Estado de implementación

- T07: endpoint, firma HMAC raw, parsing defensivo e inbox PostgreSQL idempotente implementados; las pruebas unitarias pasan. La migración del inbox se verificó con PostgreSQL embebido, pero la prueba pgTAP en Supabase CLI local sigue pendiente porque este entorno no tiene Docker/Podman y no se configuró un proyecto remoto.
- T08–T10: no iniciados; worker, outbox, parser y flujo conversacional no están habilitados.
