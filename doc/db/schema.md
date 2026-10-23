# Esquema y decisiones de persistencia

## Entidades

La primera migración se encuentra en
[`20261023193147_initial_schema.sql`](../../supabase/migrations/20261023193147_initial_schema.sql).
Las migraciones siguientes deben generarse con `supabase migration new <nombre>` y no deben modificar una migración ya aplicada.

- `users`: solicitantes identificados por teléfono E.164.
- `issuers`: técnicos/emisores, CUIT como texto, punto de venta y verificación de autorización ARCA.
- `user_issuers`: emisores habilitados para cada usuario.
- `inbound_events`: inbox durable e idempotente para mensajes y estados de WhatsApp.
- `invoice_requests`, `issuance_attempts`, `invoices`: pedidos, intentos y resultados autorizados; importes `numeric(15, 2)`, documentos fiscales en texto.
- `outbound_messages`, `audit_events`: outbox y trazabilidad para módulos futuros.

## Restricciones

- `inbound_events.event_id` impide aceptar dos veces el mismo evento.
- Emisor, punto de venta, tipo y número son únicos en cada comprobante.
- Un emisor no puede activarse sin evidencia de autorización ARCA registrada.
- Los estados e importes tienen restricciones en la base, además de validación de aplicación.
- `receiver_vat_condition` es un campo provisional; la condición fiscal/códigos requeridos siguen bloqueados hasta verificarlos en fuentes oficiales.

## Acceso y RLS

Todas las tablas de `public` tienen Row Level Security activado y no otorgan privilegios directos de tabla a `anon` ni `authenticated`. No se crean políticas de cliente hasta que exista un flujo de identidad/autorización aprobado. La API actual conecta desde el runtime Node con la URI PostgreSQL privada de Supabase y no expone esta credencial al navegador.

RLS no limita la conexión de base de datos privilegiada del backend. La autorización de usuarios y emisores aún debe implementarse en la lógica de servidor y requiere resolver D-06 antes de habilitar administración.

## Alcance aún no implementado

El esquema reserva tablas para workers/outbox y emisión futura, pero el worker, onboarding administrativo, parser y conexión ARCA no están habilitados. No se deben insertar CAE ni otros resultados ficticios.

Ver también [webhook](../app/webhook.md), [documentación del módulo](./README.md) y [Fase 1](../../spec/phases/phase-01-foundation.md).
