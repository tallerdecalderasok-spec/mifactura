# Plan de implementación por tareas

**Estado:** implementación parcial. T04 y el endpoint webhook tienen código y pruebas unitarias; T05 tiene migración/configuración Supabase creada pero falta ejecutarla localmente. No hay credenciales ni conexión a un proyecto remoto.

## Condiciones de ejecución

- El orden expresa dependencias, no autoriza automáticamente cambios fiscales ni emisión real.
- Completar [decisiones y bloqueadores](./project-spec.md#14-decisiones-pendientes--bloqueadores) antes de codificar la superficie afectada.
- Consultar documentación oficial vigente y las skills [ARCA](../.agents/skills/arca-facturacion-electronica/SKILL.md) y [WhatsApp](../.agents/skills/whatsapp-cloud-api-bot/SKILL.md) en tareas correspondientes.
- Todo desarrollo fiscal y Meta empieza en pruebas/homologación; no incluir secretos reales en el repositorio.
- La puesta en producción queda fuera de autorización de este plan y requiere aprobación separada.

## Resumen de fases

1. [Fase 0 — Decisiones y viabilidad](./phases/phase-00-discovery.md): T01–T03.
2. [Fase 1 — Fundación, persistencia y acceso](./phases/phase-01-foundation.md): T04–T06.
3. [Fase 2 — WhatsApp y flujo conversacional](./phases/phase-02-whatsapp-flow.md): T07–T10.
4. [Fase 3 — ARCA, emisión y conciliación](./phases/phase-03-arca-issuance.md): T11–T12.
5. [Fase 4 — Comprobante, operación y piloto](./phases/phase-04-receipt-pilot.md): T13–T16.

Cada fase tiene una spec separada con alcance, precondiciones, tareas y criterios de salida. Usar la spec de fase concreta para implementar; esta tabla es el roadmap integral.

## Tareas detalladas

| ID | Tarea y dependencias | Entregable | Criterio de salida |
|---|---|---|---|
| T01 | Cerrar decisiones de producto y normativa. Sin dependencias. | Contrato final de mensaje, concepto, condición fiscal/receptor, expiración, límites, datos de comprobante y roles. | Cada decisión D-01/D-02/D-04/D-08 queda confirmada con fuente oficial o registrada como bloqueo; no hay códigos asumidos. |
| T02 | Resolver spike multi-CUIT de ARCA. Depende de T01 y credenciales de prueba autorizadas. | Informe reproducible de homologación, CUIT del certificado, CUIT representado, autorización, servicio, punto de venta, consulta y emisión de prueba. | Se demuestra el modelo para emisores de prueba, incluyendo consulta/conciliación; si falla, se detiene la ruta de emisión y se decide alternativa. |
| T03 | Elegir arquitectura operativa. Depende de T01; puede correr en paralelo con T02. | Decisión de Next.js/runtime, hosting, Supabase PostgreSQL/migraciones, cola/worker durable, gestión de secretos, dominio, límites y recuperación. | Se documentan componentes, fallos esperados, SLO iniciales y cómo impedir procesamiento solo en memoria. |
| T04 | Inicializar aplicación y configuración segura. Depende de T03. | Next.js App Router + TypeScript, scripts, validación de entorno, `.env.example`, health check y guardas de ambiente. | Build/typecheck/lint existentes pasan; runtime Node seleccionado; tests no pueden usar configuración productiva por defecto; ningún secreto se versiona. |
| T05 | Implementar modelo PostgreSQL y repositorios. Depende de T03/T04. | Migraciones Supabase transaccionales, repositorios tipados y constraints para usuarios, emisores, permisos, inbox, pedidos, intentos, invoices, outbox y auditoría. | Migración limpia y repetible en DB vacía; unicidades y transiciones críticas probadas; montos DECIMAL y documentos texto. |
| T06 | Implementar administración/onboarding de usuarios y emisores. Depende de T05 y decisión D-06. | Mecanismo controlado para activar solicitantes, emisores, CUIT, punto de venta y relación usuario-emisor. | Pruebas demuestran que solo operador autorizado modifica accesos y que usuario no puede elegir emisor no asignado. |
| T07 | Implementar webhook oficial de Meta. Depende de T04/T05 y configuración Meta de prueba. | GET handshake, POST con firma raw HMAC, validación de payload y persistencia idempotente en inbox; eventos de estado se separan de mensajes. | Pruebas cubren firma válida/inválida/faltante y JSON malformado; un evento duplicado no crea dos registros inbox; respuesta positiva ocurre después del commit durable. |
| T08 | Implementar worker durable y outbox de WhatsApp. Depende de T03/T05/T07. | Reclamación de eventos, retries recuperables, backoff, redrive, salida con estado Meta y gestión de resultado incierto. | Reinicio no pierde evento aceptado; errores no quedan ocultos; retry de envío no duplica mensaje sensible a ciegas; estados de Meta actualizan outbox. |
| T09 | Implementar parser y dominio de pedido. Depende de T01/T05. | Parser tipado, validaciones fiscales/configurables, decimal exacto, límite monto, documento y errores funcionales. | Pruebas de contrato acordado, monto ambiguo rechazado, negativos/límites/redondeo cubiertos y códigos/condiciones trazables a documentación oficial. |
| T10 | Implementar máquina conversacional. Depende de T06/T08/T09. | Solicitud, resumen, confirmación/cancelación, expiración y respuestas seguras por outbox. | Confirmación se vincula al pedido vigente del solicitante; `SI` duplicado, pedido expirado, `NO` y emisor ajeno no disparan emisión ni afectan otros pedidos. |
| T11 | Implementar adaptador ARCA. Depende de T02/T03/T04. | Adaptador tipado para consultas/emisión y errores categorizados; certificados/credenciales de homologación solo servidor. | Contratos verificados con versión del SDK; runtime soportado; tests con mocks y smoke test no productivo; respuestas y CAE no se inventan ni se filtran. |
| T12 | Implementar servicio de emisión y conciliación. Depende de T05/T10/T11. | Reclamación atómica, estado `EN_PROCESO`, lock coordinado por CUIT/punto/tipo, intento durable, persistencia de respuesta, estado `DUDOSA` y conciliación restringida. | Pruebas de concurrencia y cortes en cada punto crítico; ninguna reemisión automática incierta; sólo `EMITIDA` con autorización persistida. |
| T13 | Implementar comprobante web y QR. Depende de T01/T05/T12 y validación oficial de QR. | Ruta imprimible protegida, datos fiscales mínimos y QR según manual vigente. | Casos de homologación abren/validan QR correcto; acceso no enumera registros; contenido escapado; no se muestra comprobante si no está emitido. |
| T14 | Implementar observabilidad y procedimientos operativos. Depende de T03/T05/T08/T12. | Logs redactados, correlation IDs, métricas/alertas, respaldo/retención, rotación, revisión de `DUDOSA` y runbooks. | Pruebas/log review sin secretos ni documentos completos; alerta `DUDOSA` demostrada; acceso administrativo y acciones auditadas. |
| T15 | Integración E2E en homologación y piloto controlado. Depende de T06-T14 y bloqueadores fiscales resueltos. | Suite E2E, evidencia Meta/ARCA, checklist de aceptación, rollback y piloto limitado. | Aceptación de la [especificación](./project-spec.md#13-pruebas-y-aceptación-del-mvp) pasa; modelo multi-CUIT probado; incidentes/rollback documentados; aprobación del responsable para piloto. |
| T16 | Evaluar aprobación de producción. Depende de T15 y autorización explícita. | Checklist productivo, credenciales separadas, responsables, alertas y plan de reversión. | No se activa automáticamente por el cierre del piloto; requiere aprobación documentada. No forma parte de la ejecución presente. |

## Trazabilidad requisito -> tarea

| Requisitos | Tareas que los implementan/verifican |
|---|---|
| RF-01–RF-02: autorización de solicitante y emisor | T05, T06, T09, T10, T15 |
| RF-03–RF-04: parsing y validación | T01, T09, T10, T15 |
| RF-05: deduplicación del evento | T05, T07, T08, T15 |
| RF-06–RF-07: confirmación/cancelación | T05, T09, T10, T12, T15 |
| RF-08–RF-10: emisión y conciliación | T02, T05, T11, T12, T15 |
| RF-11–RF-12: eventos y mensajería Meta | T07, T08, T10, T15 |
| RF-13: comprobante/QR | T01, T05, T12, T13, T15 |
| RF-14: operación administrativa | T03, T05, T06, T14, T15 |
| RF-15: orden conversacional por solicitante | T05, T08, T10, T15 |
| Requisitos no funcionales: durabilidad, privacidad, seguridad y recuperación | T03–T08, T11–T15 |

## Orden de ejecución recomendado

```text
T01 ──┬──> T02 ───────────────┐
      └──> T03 -> T04 -> T05 -> T06 ─┐
                     ├──> T07 -> T08 ├-> T10 -> T12 -> T13
                     └──> T09 ───────┘       T11 ─┘
                                             T14
                          T06-T14 -> T15 -> (aprobación) T16
```

T02 y T03 pueden avanzar en paralelo después de T01. T07 y T09 pueden avanzar en paralelo una vez resueltas sus dependencias. T12 no comienza hasta tener persistencia, conversación, adaptador y decisión multi-CUIT verificadas.

## Guía de ejecución y riesgos por fase

### Fase A — Especificación y decisiones (T01–T03)

- Cerrar dudas de negocio con el responsable; convertir respuestas en requisitos trazables.
- Revisar manual WSFEv1, tablas ARCA, documentación Meta y documentación del SDK en sus versiones vigentes.
- Ejecutar spike de homologación multi-CUIT antes de tomar una decisión de credenciales de producción.
- Confirmar arquitectura que puede aceptar webhooks durablemente y operar worker/outbox tras reinicio.
- Si ARCA no confirma multi-CUIT, bloquear T11/T12 para esa estrategia; no simularla.

### Fase B — Fundación, persistencia y acceso (T04–T06)

- Inicializar estructura coherente con el repositorio real (actualmente no hay app).
- Configurar validación segura de variables y ambientes.
- Crear migraciones con constraints y estados; no mantener el esquema conceptual inicial como código sin revisión.
- Definir cómo se administran permisos/emisores antes de aceptar tráfico.

### Fase C — WhatsApp y negocio (T07–T10)

- Implementar handshake y HMAC exactamente sobre el cuerpo recibido.
- Persistir inbox antes del ACK y no depender de promesas in-memory.
- Incluir delivery status events como eventos separados.
- Testear parser/flujo con datos de prueba; ningún mensaje entrante es una instrucción administrativa.
- Vincular `SI`/`NO` a un pedido con estado y expiración, protegiendo replays.

### Fase D — ARCA y seguridad transaccional (T11–T12)

- Separar el adaptador de proveedor del dominio y del webhook.
- Persistir intento antes del request remoto, sin transacción larga abierta durante la red salvo diseño justificado.
- Implementar clasificación segura de rechazo frente a incertidumbre; no depender de regex de texto.
- Hacer conciliación consultando los datos necesarios antes de un reintento humano.
- No hacer pruebas automáticas contra producción.

### Fase E — Comprobante, operación y piloto (T13–T16)

- Validar datos obligatorios, QR y URL contra manual ARCA vigente.
- Revisar privacidad, exposición de enlaces y retención.
- Probar recuperación, cola, concurrencia, observabilidad, respaldo y procesos de soporte.
- Completar homologación y piloto con alcance limitado. Cualquier producción posterior requiere autorización separada.

## Definition of Done por tarea

Cada tarea se cierra solo si:

1. Entregable y criterios de salida de la fila correspondiente se cumplen.
2. Pruebas centradas en sus riesgos pasan y comandos/resultados quedan reportados.
3. Errores se comunican explícitamente; no hay fallback silencioso ni éxito ficticio.
4. Documentación y variables de entorno reflejan el comportamiento real.
5. Riesgos externos no resueltos siguen identificados como bloqueadores.
