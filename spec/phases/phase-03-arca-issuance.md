# Fase 3 — ARCA, emisión y conciliación

**Estado:** pendiente. Requiere Fase 0, Fase 1, Fase 2 y spike multi-CUIT aprobado.  
**Tareas:** T11–T12 del [roadmap](../implementation-plan.md).  
**Reglas comunes:** [especificación general](../project-spec.md).

## Objetivo

Encapsular WSFEv1, emitir solo pedidos confirmados, controlar concurrencia/idempotencia y reconciliar resultados inciertos sin duplicar comprobantes.

## T11 — Adaptador ARCA

### Alcance

- Verificar versión/API de Afip SDK y compatibilidad con runtime Node elegido.
- Implementar operaciones necesarias para consultar numeración, emitir Factura C y consultar comprobante para conciliación.
- Distinguir identidad del certificado de CUIT representado y comprobar autorización.
- Validar variables, certificados y ambiente; credenciales solo en servidor.
- Mapear errores a categorías internas sin filtrar información sensible.
- Construir payload con el manual WSFEv1 vigente y decisiones de Fase 0.

### Criterios de aceptación

- Contratos del SDK comprobados contra documentación actual y homologación.
- Multi-CUIT demostrado para la estrategia elegida; una opción de constructor no basta.
- Pruebas automáticas no llaman a producción.
- CAE y datos fiscales son los devueltos por ARCA, no calculados ni inventados.

## T12 — Servicio de emisión y conciliación

### Alcance

- Reclamar atómicamente el pedido confirmado y persistir transición a `EN_PROCESO`.
- Registrar intento durable y datos para recuperación antes de llamada remota.
- Coordinar numeración por CUIT/emisor + punto de venta + tipo en todas las instancias.
- Evitar transacción larga alrededor de red sin decisión técnica expresa.
- Persistir autorización o rechazo confirmado; marcar incierto como `DUDOSA`.
- Conciliar consultando ARCA y comparando número, emisor, receptor e importe.
- Restringir acciones de conciliación/redrive y registrarlas en auditoría.

### Criterios de aceptación

- Confirmación repetida no vuelve a emitir.
- Concurrencia del mismo emisor no asigna numeración duplicada; emisores diferentes progresan independientemente.
- Se prueban cortes antes del envío, después del envío y después de respuesta antes del commit local.
- Timeout/desconexión nunca dispara reemisión automática.
- `DUDOSA` se resuelve solo con evidencia remota suficiente; si no, queda para revisión manual.
- `EMITIDA` siempre tiene CAE y autorización persistidos.

## Salida de fase

Emisión y conciliación probadas en homologación para la estrategia autorizada; producción permanece deshabilitada.

## No incluye

Inventar CAE o número; deducir rechazo definitivo de un error ambiguo; reintentar automáticamente una creación de resultado incierto.
