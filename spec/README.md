# Especificaciones del proyecto

Esta carpeta es la fuente de verdad para planificar e implementar el proyecto. Las especificaciones se organizan en una visión general y specs concretas por fase.

## Cómo usar las specs

1. Consultar [project-spec.md](./project-spec.md) para el alcance y reglas comunes.
2. Consultar [implementation-plan.md](./implementation-plan.md) para dependencias y orden de tareas.
3. Al pedir implementar una tarea, abrir la spec de la fase correspondiente en [`phases/`](./phases/).
4. Implementar solo la tarea solicitada y sus criterios de aceptación; no adelantar tareas de otras fases.
5. Si falta una decisión, una dependencia no está cumplida o la tarea contradice una regla común, detener ese alcance y pedir definición o documentar el bloqueo.
6. Al terminar, actualizar estado/criterios de esa fase y mantener los enlaces y la trazabilidad.

## Especificaciones

- [Visión general y requisitos](./project-spec.md)
- [Roadmap y dependencias](./implementation-plan.md)

## Fases

| Fase | Spec | Incluye |
|---|---|---|
| 0. Decisiones y viabilidad | [phase-00-discovery.md](./phases/phase-00-discovery.md) | Alcance, spike multi-CUIT y arquitectura operativa. |
| 1. Fundación y datos | [phase-01-foundation.md](./phases/phase-01-foundation.md) | Proyecto Next.js, configuración segura, Supabase PostgreSQL, usuarios y emisores. |
| 2. WhatsApp y flujo | [phase-02-whatsapp-flow.md](./phases/phase-02-whatsapp-flow.md) | Webhook durable, worker/outbox, parser y confirmación. |
| 3. ARCA y emisión | [phase-03-arca-issuance.md](./phases/phase-03-arca-issuance.md) | Adaptador fiscal, estados, numeración y conciliación. |
| 4. Comprobante y piloto | [phase-04-receipt-pilot.md](./phases/phase-04-receipt-pilot.md) | QR, operación, pruebas E2E y piloto controlado. |

## Referencias complementarias

- [Documentación técnica por módulo](../doc/README.md)
- [Arquitectura lógica](../doc/architecture.md)
- [AGENTS.md](../AGENTS.md)
- [README del proyecto](../README.md)
- [Documento original de referencia](../Bot%20de%20facturación%20por%20WhatsApp%20%28Factura%20C%29%20%E2%80%93%20Next.js%20+%20Afip%20SDK.md), que no reemplaza estas specs ni valida por sí mismo sus ejemplos.
