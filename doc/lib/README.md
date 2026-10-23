# Módulo `lib/`

## Propósito

Centraliza la lógica de negocio del bot, la integración con ARCA y la capa de comunicación con WhatsApp.

## Archivos previstos

- `lib/parse.ts`: parseo del pedido recibido por WhatsApp.
- `lib/bot.ts`: flujo del asistente, validación de comandos y confirmaciones.
- `lib/emitir.ts`: transacción y facturación real con validaciones de negocio.
- `lib/arca.ts`: integración con Afip SDK y WSAA / WSFEv1.
- `lib/whatsapp.ts`: envío de mensajes y gestión de respuestas.
- `lib/qr.ts`: generación o resolución del QR del comprobante.

## Relaciones

```text
parse.ts  ──► bot.ts ──► emitir.ts ──► arca.ts
   │              │
   └──────────────► whatsapp.ts
                        │
                        └─► qr.ts
```

## Alcance v1

- Factura C para monotributistas.
- Multiples emisores / técnicos con distinto CUIT.
- Confirmación previa por `SI` / `NO`.
- Historial persistente por pedido.
- Comprobante público con QR.

## Riesgos principales

- Diferencias de numeración entre puntos de venta.
- Respuestas inciertas de ARCA (estados `DUDOSA`).
- Confusión entre nombre del cliente y nombre del emisor/representante.
- Manejo incorrecto de idempotencia por `wa_message_id`.
