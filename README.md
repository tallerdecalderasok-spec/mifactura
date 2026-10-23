# Bot de facturación por WhatsApp (Factura C)

Proyecto: Next.js + Supabase (PostgreSQL) + Afip SDK + WhatsApp Cloud API.

## Contexto directo para el agente

Este sistema recibe pedidos de facturación por WhatsApp, valida el mensaje, exige confirmación del usuario, emite una Factura C con el CUIT del técnico elegido y devuelve el comprobante con QR y enlace público.

## Documentación del proyecto

- [AGENTS.md](./AGENTS.md): instrucciones operativas del repo y contexto para el agente.
- [spec/README.md](./spec/README.md): índice de specs y regla para implementar por fase.
- [spec/project-spec.md](./spec/project-spec.md): alcance, reglas comunes, requisitos y aceptación.
- [spec/implementation-plan.md](./spec/implementation-plan.md): roadmap y dependencias de tareas.
- [doc/README.md](./doc/README.md): índice de documentación técnica por módulos.
- [doc/architecture.md](./doc/architecture.md): flujo end-to-end y responsabilidades.
- [Especificación de referencia](./Bot%20de%20facturación%20por%20WhatsApp%20%28Factura%20C%29%20%E2%80%93%20Next.js%20+%20Afip%20SDK.md): documento fuente original; sus fragmentos de código son ilustrativos y no están validados.

> La aplicación está en implementación. La persistencia usa PostgreSQL administrado por Supabase con conexión exclusivamente del servidor; las credenciales de ejemplo no conectan a ningún proyecto. Antes de una tarea, revisar `spec/README.md`, la spec de su fase y sus decisiones pendientes.

## Reglas clave

- La factura se emite bajo el CUIT del técnico/emisor y no bajo el CUIT de la empresa.
- Debe validarse la estrategia multi-CUIT en homologación antes de producción.
- Solo mensajes desde teléfonos autorizados.
- La emisión exige confirmación previa con `SI`.
- El pedido debe ser idempotente por `wa_message_id`.
- Se deben manejar estados: `PENDIENTE`, `EN_PROCESO`, `EMITIDA`, `RECHAZADA`, `DUDOSA`, `CANCELADA`.
- El punto de venta debe ser exclusivo por emisor para evitar desfase de numeración.

## Arquitectura resumida

```text
WhatsApp -> webhook (app/api/whatsapp) -> parse -> bot -> emitir -> ARCA/Afip SDK
                                     |
                                     +-> Supabase PostgreSQL (servidor, inbox y pedidos)
```

## Módulos clave

- `app/api/whatsapp/route.ts`: webhook Meta + validación HMAC.
- `app/f/[id]/route.ts`: comprobante imprimible con QR.
- `lib/parse.ts`: parseo del mensaje.
- `lib/bot.ts`: flujo conversacional y confirmación.
- `lib/emitir.ts`: transacción de emisión y estados.
- `lib/arca.ts`: integración con ARCA/WSFEv1.
- `lib/whatsapp.ts`: envío de mensajes.
- `lib/qr.ts`: QR y enlace del comprobante.

## Orden recomendado de implementación

1. [Fase 0: decisiones y viabilidad](./spec/phases/phase-00-discovery.md).
2. [Fase 1: fundación, persistencia y acceso](./spec/phases/phase-01-foundation.md).
3. [Fase 2: WhatsApp y flujo conversacional](./spec/phases/phase-02-whatsapp-flow.md).
4. [Fase 3: ARCA, emisión y conciliación](./spec/phases/phase-03-arca-issuance.md).
5. [Fase 4: comprobante, operación y piloto](./spec/phases/phase-04-receipt-pilot.md).

## Referencias

- [Documentación técnica](./doc/README.md)
- [Arquitectura](./doc/architecture.md)
- [Especificación funcional](./Bot%20de%20facturación%20por%20WhatsApp%20%28Factura%20C%29%20%E2%80%93%20Next.js%20+%20Afip%20SDK.md)
