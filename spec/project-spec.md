# Especificación del proyecto: bot de Factura C por WhatsApp

**Estado:** especificación funcional/técnica de trabajo. La fundación Next.js, el esquema inicial Supabase y el webhook están en implementación; el flujo de facturación no está habilitado. Las reglas fiscales, permisos externos y decisiones marcadas como pendientes no habilitan emisión hasta verificarse.

## 1. Propósito

Permitir que técnicos autorizados soliciten por WhatsApp una Factura C por servicios. El sistema valida quién solicita y por qué emisor, presenta un resumen, exige confirmación y tramita la emisión ante ARCA. Después de una autorización confirmada, informa los datos del comprobante y ofrece una representación imprimible con QR.

La factura se emite bajo el CUIT del técnico/emisor seleccionado, no bajo el CUIT del cliente que usa el bot ni bajo el de una empresa intermediaria.

## 2. Estado del proyecto y autoridad documental

- Supabase PostgreSQL es el proveedor de base de datos elegido. La aplicación Node se conecta desde el servidor mediante `DATABASE_URL`; el runtime/hosting, el rol operativo de base de datos y la cola/worker durable siguen pendientes.
- Este archivo consolida requisitos como fuente canónica de producto.
- [La especificación de referencia](../Bot%20de%20facturación%20por%20WhatsApp%20%28Factura%20C%29%20%E2%80%93%20Next.js%20+%20Afip%20SDK.md) conserva ideas y ejemplos, pero sus fragmentos de código no están validados ni se deben copiar a producción.
- [AGENTS.md](../AGENTS.md) da reglas operativas al agente; [README.md](../README.md) resume el repositorio; esta especificación y el [plan de implementación](./implementation-plan.md) detallan alcance y ejecución.
- Si hay conflicto, prevalecen decisiones explícitamente confirmadas aquí, documentación oficial vigente de ARCA/Meta para sus servicios y validaciones de homologación. Los puntos no resueltos se mantienen como bloqueadores, no como defaults implícitos.

## 3. Alcance

### MVP incluido

- WhatsApp Business Platform Cloud API oficial de Meta.
- Usuarios/teléfonos autorizados y relación de permisos con uno o más emisores.
- Solicitud de Factura C por servicios para técnicos/emisores habilitados.
- Mensaje estructurado; formato final pendiente de cierre antes de implementar el parser.
- Resumen previo, confirmación explícita `SI`, cancelación `NO`, vencimiento de confirmación pendiente por definir.
- Persistencia de solicitudes, intentos y resultados.
- Integración con WSFEv1 mediante `@afipsdk/afip.js` si la investigación técnica valida su uso para el modelo elegido.
- Manejo de emisión concurrente, duplicados, errores e incertidumbre sin reemisión ciega.
- Comprobante consultable/imprimible y QR construido según manual vigente.
- Ejecución en homologación y piloto controlado como hitos previos a cualquier producción.

### Fuera del MVP

- Facturas A/B, notas de crédito, anulaciones y CAEA.
- Venta de productos/repuestos u otros conceptos distintos a servicios.
- Interpretación de lenguaje libre mediante IA.
- Consulta automática del padrón fiscal, reportes y PDF adjunto por WhatsApp.
- Envíos promocionales o mensajes proactivos no necesarios para el flujo iniciado por el técnico.
- Emisión real productiva como parte de desarrollo, pruebas automatizadas o este plan.

## 4. Usuarios y conceptos

| Concepto | Responsabilidad |
|---|---|
| Solicitante | Persona que escribe desde un teléfono autorizado y crea/confirma pedidos. |
| Emisor/técnico | Contribuyente cuyo CUIT, autorización y punto de venta se usan para la factura. Debe estar habilitado y asignado al solicitante. |
| Receptor/cliente | Persona o entidad a cuyo nombre se emite el comprobante. No es el emisor. |
| Operador administrativo | Rol operativo para configurar usuarios/emisores y resolver pedidos inciertos. Autenticación y alcance exactos pendientes de decisión; no exponer acciones administrativas al webhook público. |
| Pedido | Intención confirmable antes de una solicitud fiscal. No es todavía un comprobante autorizado. |
| Comprobante emitido | Resultado persistido de una autorización de ARCA, con datos fiscales devueltos por el servicio. |

El sistema debe distinguir siempre al solicitante, emisor y receptor. Ningún alias o nombre del mensaje reemplaza la autorización fiscal efectiva del emisor.

## 5. Flujos funcionales

### 5.1 Recepción y validación de webhook

1. Meta llama al endpoint HTTPS.
2. En GET, la aplicación valida el handshake con el token de verificación configurado.
3. En POST, valida la firma HMAC-SHA256 de Meta usando el cuerpo raw y el secreto de aplicación antes de parsear JSON.
4. Valida el esquema del evento y separa mensajes entrantes de notificaciones de estado.
5. Persiste durablemente el evento/mensaje con su identificador de origen y deduplica.
6. Devuelve éxito a Meta solo después de aceptar durablemente el evento; el trabajo del bot ocurre fuera del request.
7. Payloads no admitidos se registran de forma segura o se ignoran conforme a la política acordada, sin provocar respuestas de factura.

No se considera una promesa en memoria ni `after()` una cola durable sin garantías demostradas del hosting.

### 5.2 Pedido, resumen y confirmación

1. Worker procesa mensajes de un mismo solicitante en orden causal; mensajes de remitentes distintos pueden procesarse en paralelo.
2. Se valida el número del solicitante y su estado activo.
3. El mensaje se parsea con una gramática única acordada antes de programar el parser.
4. Se validan monto, receptor, datos fiscales requeridos, límite y emisor asignado.
5. Se crea pedido `PENDIENTE` y se responde con resumen que distingue emisor y receptor.
6. `SI` solo confirma el pedido pendiente vigente que pertenece al solicitante; nunca sirve como confirmación global.
7. `NO` cancela solo ese pedido pendiente. Mensajes repetidos o vencidos no deben alterar otro pedido.
8. No se invoca ARCA si la confirmación no es válida o el pedido ya cambió de estado.

La ventana exacta de expiración del pedido, formato final del mensaje y método para obtener la condición fiscal del receptor están pendientes de definición.

### 5.3 Emisión, conciliación y respuesta

1. Servicio de dominio reclama de manera atómica un pedido elegible y registra el intento.
2. Asigna/valida la secuencia para la clave emisor/CUIT + punto de venta + tipo de comprobante con coordinación compartida por todas las instancias.
3. Llama al adaptador ARCA desde Node.js, con credenciales del entorno correcto.
4. Persiste respuesta autorizada y CAE antes de comunicar éxito.
5. Un rechazo confirmado se persiste como `RECHAZADA`.
6. Timeout, desconexión o caída en que no se conoce el resultado se registra como `DUDOSA`; no se repite automáticamente `createVoucher`.
7. Un proceso restringido consulta/reconcilia en ARCA. Si la existencia/datos no pueden determinarse de forma confiable, requiere revisión manual.
8. WhatsApp comunica exclusivamente el estado persistido. Una aceptación HTTP de Meta para mensaje saliente no equivale a entrega al destinatario.

### 5.4 Comprobante

El endpoint de comprobante solo presenta un comprobante ya autorizado y persistido; nunca factura. Muestra los datos exigibles que se verifiquen en normativa vigente y omite datos personales innecesarios. Link firmado/no enumerable, protección contra modificación, escape de contenido y diseño imprimible son requisitos. La URL y payload del QR se deben contrastar con manual oficial vigente antes de aceptación.

## 6. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | Aceptar solicitudes únicamente desde solicitantes activos autorizados. |
| RF-02 | Restringir cada solicitud a emisores activos asignados a ese solicitante. |
| RF-03 | Rechazar mensajes fuera de la gramática acordada con respuesta de ayuda segura. |
| RF-04 | Validar importe, datos del receptor, concepto y condición fiscal en backend; el límite nunca depende solo del parser/UI. |
| RF-05 | Crear un único pedido por evento de entrada de Meta y conservar correlación con su ID de origen. |
| RF-06 | Mostrar resumen y requerir confirmación explícita, vigente y vinculada al pedido. |
| RF-07 | Permitir cancelar solo un pedido elegible y sin intento de emisión iniciado. |
| RF-08 | Emitir Factura C por el CUIT emisor autorizado y registrar punto de venta, tipo, número, fechas, CAE y vencimiento devueltos por ARCA. |
| RF-09 | No emitir dos veces por reentrega de Meta, confirmación repetida, worker duplicado ni retry de API. |
| RF-10 | Distinguir rechazo definitivo de resultado incierto; ofrecer conciliación y revisión de `DUDOSA`. |
| RF-11 | Procesar y registrar notificaciones de estado de mensajes salientes sin interpretarlas como mensajes del usuario. |
| RF-12 | Enviar resumen, confirmación requerida, cancelación, éxito/rechazo o estado incierto por Cloud API conforme a las reglas vigentes de Meta. |
| RF-13 | Mostrar comprobante autorizado en una ruta protegida contra enumeración y con QR verificado oficialmente. |
| RF-14 | Dar al operador autorizado acceso a cola de casos inciertos y acciones auditables; su mecanismo de autenticación queda como decisión de arquitectura. |
| RF-15 | Preservar el orden conversacional por solicitante o rechazar de forma segura confirmaciones cuyo pedido previo aún no está persistido/procesado. |

## 7. Requisitos no funcionales y criterios verificables

- **Durabilidad:** ningún evento aceptado con respuesta 200 puede depender solo de memoria del proceso; aceptación mediante registro duradero comprobable.
- **Idempotencia:** pruebas de eventos duplicados, `SI` duplicado y reintentos internos demuestran que existe como máximo una solicitud de emisión por pedido.
- **Concurrencia:** pruebas paralelas para un mismo emisor/punto de venta/tipo no asignan número duplicado; distintos emisores no quedan bloqueados globalmente sin motivo.
- **Seguridad:** firma inválida o ausente no se procesa; autorización de emisor se verifica por recurso en servidor.
- **Privacidad:** no se registran secretos, certificados, cuerpos completos de WhatsApp ni DNI/CUIT completos en logs generales; retención por acordar.
- **Separación de entornos:** tests y configuración por defecto nunca pueden emitir en producción; producción requiere acción explícita y checklist de aprobación.
- **Trazabilidad:** cada pedido y acción relevante se correlaciona con ID interno, evento de Meta y operación externa sin incluir credenciales.
- **Recuperación:** el sistema puede reanudar eventos aceptados, procesar outbox y conciliar `DUDOSA` tras reinicio.
- **Orden conversacional:** en pruebas con solicitud y confirmación consecutivas, el resultado no depende del orden de ejecución de workers concurrentes.
- **Errores:** fallos de configuración, validación, integración y resultado incierto se distinguen; nunca se devuelve éxito ficticio.
- **Disponibilidad y latencias objetivo:** fijar SLO/timeout tras elegir hosting, cola y límites de Meta/ARCA; no inventar números antes de decidir infraestructura.

## 8. Arquitectura lógica propuesta

```text
Meta Cloud API
      |
      v
Route Handler (handshake, HMAC, validación de evento)
      |
      +--> Supabase PostgreSQL: inbox idempotente (commit durable antes del ACK)
                         |
                         v
                    Worker duradero
                         |
             +-----------+------------+
             v                        v
       Flujo conversacional      Outbox de mensajes
             |                        |
             v                        v
       Dominio de pedidos        Meta Graph API
             |
             v
       Servicio de emisión <----> Adaptador ARCA / Afip SDK <----> WSFEv1
             |
       Supabase PostgreSQL: pedido, intentos, comprobante, auditoría
             |
             v
       Ruta imprimible + QR verificado
```

### Límites obligatorios

- Route Handler valida/transfiere eventos; no contiene reglas fiscales ni ejecuta llamadas largas a ARCA.
- Capa WhatsApp no decide si una emisión es válida; la decisión pertenece al dominio y al estado persistido.
- Supabase PostgreSQL aplica transacciones, restricciones e idempotencia. No se mantiene una transacción larga abierta durante una solicitud remota sin decisión técnica explícita.
- Adaptador ARCA encapsula SDK, runtime Node, autenticación y contratos de WSFEv1.
- Servicio de emisión coordina reclamación, bloqueo lógico/distribuido, estado y conciliación.
- Comprobante transforma datos ya persistidos; no consulta datos arbitrariamente ni genera CAE.
- Supabase está elegido como proveedor PostgreSQL. Hosting/runtime, modalidad de conexión, rol DB de mínimo privilegio y cola/worker aún no están escogidos.

## 9. Contratos externos y restricciones

### Meta WhatsApp Cloud API

- Usar la plataforma oficial de Meta; no automatizar WhatsApp Web ni usar librerías que simulan un usuario.
- Separar `WA_VERIFY_TOKEN`, `WA_APP_SECRET`, `WA_TOKEN`, `WA_PHONE_ID` y `WA_GRAPH_VERSION`.
- Leer cuerpo raw y validar `X-Hub-Signature-256` en tiempo constante antes de parsear el POST.
- Soportar payloads de mensajes y estados por separado; el webhook puede comunicar mensajes entrantes y estado de envíos, entre otros eventos.
- La versión de Graph API y permisos deben ser explícitos y vigentes al desplegar.
- Confirmar ventana de atención, plantillas, permisos, número y límites desde documentación Meta durante el despliegue.

### ARCA / Afip SDK

- El alcance es Factura C de servicios. El sitio oficial describe WSFEv1 para comprobantes A, B, C y M sin detalle de ítems; revisar el manual vigente y el régimen aplicable antes de definir payloads.
- `@afipsdk/afip.js` es el SDK previsto, no una decisión irreversible; validar versión, contrato, runtime Node y credenciales contra documentación actual.
- La autorización multi-CUIT (delegación o credencial por emisor) es bloqueador de producción hasta verificarse en homologación, como mínimo con los emisores de prueba definidos.
- No asumir que seleccionar `CUIT`/`tax_id` en el SDK prueba por sí solo la autorización fiscal.
- No codificar tipos de documento, condición IVA, campos requeridos, fechas, importes, tolerancias o formato QR sin contrastar tablas y manual WSFEv1 vigentes.
- Respuesta de ARCA y CAE son datos externos; no se inventan ni se reportan como emitidos sin persistencia y reconciliación.

## 10. Modelo de datos conceptual

El esquema final se decidirá con la arquitectura operativa. Como mínimo debe representar:

- `users`: identidad interna, teléfono normalizado, estado y datos mínimos del solicitante.
- `issuers`: alias, razón social y datos fiscales necesarios, CUIT como cadena validada, punto de venta, estado y referencia segura a la estrategia de credenciales/autorización.
- `user_issuers`: permisos explícitos muchos-a-muchos.
- `inbound_events`: ID externo único, tipo, datos necesarios minimizados, estado de proceso, timestamps y error normalizado.
- `invoice_requests`: solicitante, emisor, receptor, importe decimal, concepto, condición fiscal confirmada, expiración de confirmación, estado y referencias de origen.
- `issuance_attempts`: clave de numeración, número intentado, envío/resultado, timestamps, error categorizado y datos para conciliar.
- `invoices`: comprobante autorizado, CAE, vencimiento y snapshot de los campos fiscales emitidos.
- `outbound_messages`: destino, plantilla/tipo, contenido mínimo, ID Meta, estado de entrega, intentos y resultado incierto.
- `audit_events`: actor, acción, entidad, fecha y datos mínimos para operaciones administrativas.

Invariantes: IDs de eventos únicos; números únicos por emisor/CUIT+punto de venta+tipo; transición de estado restringida; importes PostgreSQL `NUMERIC/DECIMAL`; documentos CUIT/DNI almacenados como cadenas; secretos fuera de tablas/logs si no hay una solución de vault revisada. Retención y borrado de datos personales requieren decisión.

## 11. Estados de pedido y emisión

### Estados de negocio

- `PENDIENTE`: creado, esperando confirmación.
- `EN_PROCESO`: reclamado atómicamente y con intento durable registrado antes de llamar a ARCA.
- `EMITIDA`: autorización confirmada, CAE/datos persistidos.
- `RECHAZADA`: rechazo confirmado y error normalizado persistido.
- `DUDOSA`: no se puede determinar si ARCA autorizó la operación.
- `CANCELADA`: cancelación antes de comenzar un intento de emisión.

### Transiciones admitidas

```text
PENDIENTE -> EN_PROCESO -> EMITIDA
                       -> RECHAZADA
                       -> DUDOSA -> EMITIDA (conciliada)
                                  -> RECHAZADA (no emitida, verificado)
PENDIENTE -> CANCELADA
```

`DUDOSA` no vuelve a emisión automática. Reabrir/reintentar exige evidencia de conciliación y acción registrada. No se permite `CANCELADA -> EMITIDA`, ni emitir de nuevo una fila `EMITIDA`. La clasificación debe derivarse de categorías/contrato de error, no regex de mensajes incidentales.

### Reglas de numeración e idempotencia

- Clave de exclusión: emisor/CUIT + punto de venta + tipo de comprobante.
- El mecanismo debe coordinar todas las instancias de la aplicación/worker; no usar mutex local.
- Registrar intento y número consultado antes de la operación remota con estrategia de recuperación tras caída.
- La creación remota y la transacción PostgreSQL no son atómicas. Diseñar y probar interrupciones antes del envío, luego del envío y luego de recibir CAE antes de persistir.
- Consultar ARCA antes de concluir o reemitir una operación incierta. Coincidencia de número sola no basta: comparar datos de identidad/importe y referencia fiscal.

## 12. Seguridad, privacidad y operación

- Validación HMAC de webhook sobre bytes/texto original y secreto de aplicación servidor.
- Lista blanca y autorización por emisor en cada operación, no solo al parsear.
- Validar tipos, tamaño de payload, estructura, entrada y URLs; escapar contenido variable en HTML.
- Secretos solamente en gestor de secretos o variables de servidor; `.env.example` vacío y sin prefijo `NEXT_PUBLIC_`.
- Homologación y producción aisladas. Rutas/worker de test no deben poder seleccionar producción por accidente.
- Minimizar datos personales del cliente y del técnico. Definir acceso, retención, borrado, backups y exportación antes del piloto.
- No loguear tokens, certificados, claves, cabeceras Authorization, cuerpos completos, DNI/CUIT completo ni firma HMAC.
- Respuestas de WhatsApp no filtran stack traces, SQL ni errores sensibles de proveedor.
- Casos `DUDOSA`, credenciales próximas a expirar, errores persistentes y cola atrasada requieren alertas y procedimiento de revisión.
- Acciones administrativas de alta, conciliación y reintento requieren autenticación, permisos y auditoría; mecanismo pendiente.

## 13. Pruebas y aceptación del MVP

### Unitarias y de dominio

- Gramática y casos de monto; redondeo decimal y valores inválidos/límite.
- Documento y condición fiscal contra tablas/casos de prueba oficiales.
- Confirmación expirada, confirmación repetida, cancelación y emisor no asignado.
- Transiciones prohibidas y límites de autorización.

### Integración y resiliencia

- GET handshake válido/incorrecto; POST firma válida, inválida, faltante, cuerpo modificado y JSON malformado.
- Eventos Meta con mensajes, status events, varios mensajes, campos desconocidos y duplicados.
- Evento repetido produce un pedido como máximo; ACK solo después de persistencia.
- Solicitud seguida inmediatamente por `SI` no confirma un pedido diferente ni falla por una carrera de workers.
- Worker reiniciado retoma el evento; outbox reintenta según política sin duplicación ciega.
- Dos emisiones simultáneas del mismo emisor no asignan secuencia duplicada; distintos emisores pueden avanzar.
- Rechazo confirmado, timeout antes/después de enviar, caída tras respuesta con CAE y conciliación.
- Usuario inactivo, emisor inactivo/no asignado y pedido que no está pendiente no alcanzan ARCA.
- Comprobante y QR se validan contra datos de homologación y manual oficial.
- Tests bloquean cualquier endpoint/configuración de producción.
- Fixtures/logs no contienen secretos ni documentos completos.

### Aceptación de homologación

El MVP se considera aceptable para piloto solo con autorización de ARCA comprobada en homologación para el modelo multi-CUIT decidido; mensajes Meta de prueba recibidos y estados gestionados; duplicados, concurrencia y recuperación probados; CAE persistido; `DUDOSA` conciliable; y representación/QR contrastados con fuente oficial. Producción requiere checklist fiscal/operativo y aprobación separada.

## 14. Decisiones pendientes / bloqueadores

| ID | Decisión o verificación | Bloquea |
|---|---|---|
| D-01 | Gramática del mensaje; ubicación y validación de la condición fiscal del receptor. | Parser y pruebas de aceptación. |
| D-02 | Requisitos/códigos fiscales, fechas, importes y QR vigentes en manual WSFEv1 y tablas ARCA. | Payload productivo y comprobante. |
| D-03 | Delegación multi-CUIT frente a credencial por emisor; resultado reproducible de homologación. | Emisión multiemisor y producción. |
| D-04 | Concepto exacto del servicio, detalle requerido y política de vencimiento del pedido. | Mensaje, datos y contenido fiscal. |
| D-05 | Supabase PostgreSQL está elegido. Falta definir hosting/runtime, modalidad y rol de conexión, cola/worker y operación durable. | Diseño final y SLO. |
| D-06 | Mecanismo autorizado de alta de usuarios/emisores y administración/conciliación. | Gestión de accesos y soporte. |
| D-07 | Acceso, expiración y privacidad de enlaces públicos; datos obligatorios del comprobante. | Comprobante imprimible. |
| D-08 | Límite por factura, retención de datos, SLO/latencias y plan de piloto. | Operación y aprobación de piloto. |
| D-09 | Cuenta/tokens/permisos Meta, versión de Graph API, plantillas y costos vigentes. | Despliegue y mensajería saliente. |

## 15. Fuentes primarias

Consultadas al redactar esta especificación; deben revisarse de nuevo antes de implementar requisitos fiscales o desplegar integraciones:

- [ARCA: ayuda, homologación, tablas y manuales](https://www.arca.gob.ar/fe/ayuda/webservice.asp)
- [ARCA: documentación de web services de factura electrónica](https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp) — la página consultada enumera WSFEv1 y enlaza el manual de desarrollador vigente. Confirmar el detalle del caso de uso dentro del manual antes de fijar payload.
- [Afip SDK: Factura C](https://docs.afipsdk.com/siguientes-pasos/web-services/factura-electronica/factura-c) — referencia de integración, subordinada al manual de ARCA y a la prueba en homologación.
- [Meta: WhatsApp webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview) — describe eventos entrantes, estados de mensajes y suscripción de webhook; revisar contrato específico al implementar.
- [Meta: crear endpoint webhook](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/)
- [Meta: Cloud API, inicio rápido](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started)

Fuentes no oficiales del documento original no se usan como autoridad para normas fiscales o permisos de Meta.
