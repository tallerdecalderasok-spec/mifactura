# Fase 4 — Comprobante, operación y piloto

**Estado:** pendiente. Depende de las Fases 0–3 y de los bloqueos fiscales/privacidad aplicables.  
**Tareas:** T13–T16 del [roadmap](../implementation-plan.md).  
**Reglas comunes:** [especificación general](../project-spec.md).

## Objetivo

Presentar comprobantes autorizados, preparar operación y validar el sistema integral en homologación antes de proponer piloto limitado.

## T13 — Comprobante imprimible y QR

### Alcance

- Mostrar solo comprobantes persistidos como `EMITIDA`.
- Definir link firmado/no enumerable y acceso según privacidad/expiración aprobados.
- Renderizar datos fiscales verificados contra la normativa vigente.
- Construir QR con URL/estructura del manual oficial y validar con datos de homologación.
- Escapar contenido y evitar exposición de datos innecesarios.

### Criterios de aceptación

- No se consulta un pedido no emitido ni se enumeran facturas.
- QR comprobado contra el documento/consulta oficial para un caso de homologación.
- Vista legible e imprimible con información exigida y mínima exposición.

## T14 — Observabilidad y operación

### Alcance

- Correlation IDs, logs redactados y métricas.
- Alertas para `DUDOSA`, errores persistentes, fallos de autenticación y atraso de cola.
- Procedimientos de conciliación, redrive autorizado, backups, retención y rotación de secretos.
- Permisos y auditoría para acciones administrativas.

### Criterios de aceptación

- Casos simulados generan alertas operativas.
- Logs de prueba no contienen secretos, cuerpos completos ni documentos fiscales completos.
- Procedimientos recuperan eventos y revisan `DUDOSA` sin reemisión ciega.

## T15 — E2E en homologación y piloto controlado

### Alcance

- Ejecutar aceptación funcional, seguridad, concurrencia, fallos y privacidad.
- Verificar Cloud API en números de prueba y estado de envíos.
- Probar emisión/consulta en homologación para los emisores autorizados.
- Documentar alcance, límites, monitoreo, rollback y responsable del piloto.

### Criterios de aceptación

- Se cumple la [aceptación del MVP](../project-spec.md#13-pruebas-y-aceptación-del-mvp).
- Bloqueadores fiscales resueltos o excluidos explícitamente del piloto.
- Piloto aprobado por responsable, con capacidad de detener emisiones.

## T16 — Evaluar producción (aprobación separada)

### Alcance

- Revisión fiscal, técnica, seguridad y soporte independiente.
- Separación de secretos productivos y homologación.
- Aprobación explícita, responsables, monitorización y rollback.

### Criterios de aceptación

- Checklist completo y aprobación documentada.
- Sin aprobación, la aplicación permanece en homologación/piloto y no usa credenciales productivas.

## Salida de fase

Comprobante, monitoreo y recuperación validados; piloto autorizado o bloqueado con motivo. Producción requiere aprobación explícita posterior.

## No incluye

La finalización técnica no equivale a autorización fiscal, aprobación de Meta ni permiso productivo.
