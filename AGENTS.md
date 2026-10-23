# Bot de facturación por WhatsApp (Factura C)

Proyecto: Next.js + Supabase (PostgreSQL) + Afip SDK + WhatsApp Cloud API.

## Contexto directo para el agente

Este sistema recibe pedidos de facturación por WhatsApp, valida el mensaje, exige confirmación del usuario, emite una Factura C con el CUIT del técnico elegido y devuelve el comprobante con QR y enlace público.

### Regla más importante

La factura se emite bajo el CUIT del técnico/emisor, no bajo el CUIT de la empresa. Eso exige validar la estrategia multi-CUIT antes de producción: delegación del servicio o certificado por técnico.

## No negociables

- Solo mensajes desde teléfonos autorizados.
- El pedido usa un mensaje estructurado; su gramática final se define en T01 antes de implementar el parser.
- La emisión requiere confirmación previa con `SI`.
- Cada pedido debe ser idempotente por `wa_message_id`.
- Deben manejarse estados: `PENDIENTE`, `EN_PROCESO`, `EMITIDA`, `RECHAZADA`, `DUDOSA`, `CANCELADA`.
- El punto de venta debe ser exclusivo por emisor para evitar desfase de numeración.
- No usar credenciales reales ni emitir comprobantes productivos durante desarrollo.

## Arquitectura resumida

```text
WhatsApp -> webhook (app/api/whatsapp) -> parse -> bot -> emitir -> ARCA/Afip SDK
                                     |
                                     +-> Supabase PostgreSQL (usuarios, emisores, pedidos)
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
- `doc/`: documentación técnica por módulo.

## Skills del proyecto

```text
/arca-facturacion-electronica
/whatsapp-cloud-api-bot
```

Usarlas juntas cuando el trabajo abarque ARCA + WhatsApp + flujo completo.

## Orden recomendado de implementación

1. [Fase 0: decisiones y viabilidad](./spec/phases/phase-00-discovery.md).
2. [Fase 1: fundación, persistencia y acceso](./spec/phases/phase-01-foundation.md).
3. [Fase 2: WhatsApp y flujo conversacional](./spec/phases/phase-02-whatsapp-flow.md).
4. [Fase 3: ARCA, emisión y conciliación](./spec/phases/phase-03-arca-issuance.md).
5. [Fase 4: comprobante, operación y piloto](./spec/phases/phase-04-receipt-pilot.md).

## Implementar por fase (obligatorio)

- Las especificaciones de implementación viven en `spec/`; el índice es [spec/README.md](./spec/README.md).
- Antes de ejecutar una tarea solicitada, leer [spec/project-spec.md](./spec/project-spec.md), [spec/implementation-plan.md](./spec/implementation-plan.md) y la spec de fase correspondiente en `spec/phases/`.
- Limitar el cambio a la tarea/fase pedida y sus criterios de aceptación. No adelantar trabajo de fases posteriores sin autorización.
- Si hay una precondición pendiente, una contradicción o un bloqueo externo, detener esa parte y explicar qué decisión/evidencia falta; no inventar defaults.
- Al terminar una tarea, verificar sus criterios y pruebas, actualizar su estado/resultado en la documentación de fase o plan y enlazar cualquier decisión nueva.
- Mantener `doc/` como documentación técnica de módulos/arquitectura. No colocar ahí specs nuevas.

## Referencias útiles

- [README.md](./README.md): contexto general del proyecto.
- [spec/README.md](./spec/README.md): índice de especificaciones por fase y guía de uso.
- [spec/project-spec.md](./spec/project-spec.md): fuente canónica de alcance y requisitos.
- [spec/implementation-plan.md](./spec/implementation-plan.md): roadmap, tareas y dependencias.
- [spec/phases/](./spec/phases/): alcance y aceptación por fase.
- [doc/README.md](./doc/README.md): índice de documentación técnica.
- [doc/architecture.md](./doc/architecture.md): flujo y responsabilidades.
- [Especificación de referencia](./Bot%20de%20facturación%20por%20WhatsApp%20%28Factura%20C%29%20%E2%80%93%20Next.js%20+%20Afip%20SDK.md): material anterior; no tratar sus ejemplos como código aprobado.
- [Skill de ARCA](./.agents/skills/arca-facturacion-electronica/SKILL.md) y [skill de WhatsApp](./.agents/skills/whatsapp-cloud-api-bot/SKILL.md): procedimientos específicos para cambios de integración.
- ARCA: homologación y WSFE
- Afip SDK: Node.js y Factura C
- Meta: WhatsApp Cloud API + webhooks

Este archivo funciona como guía operativa del agente y enlaza con la documentación detallada del sistema.
