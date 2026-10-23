---
name: arca-facturacion-electronica
description: Diseña, implementa, prueba y audita la integración de Next.js/Node.js con ARCA WSFEv1 mediante @afipsdk/afip.js, especialmente Factura C, CAE, emisores con distintos CUIT, numeración concurrente y conciliación de emisiones inciertas.
---

# Skill: integración de facturación electrónica con ARCA

## Objetivo

Guiar al agente para implementar una integración mantenible y segura entre la aplicación Next.js (App Router), PostgreSQL y los web services de facturación electrónica de ARCA, usando `@afipsdk/afip.js` cuando sea adecuado. El alcance inicial del proyecto es emitir Facturas C por servicios, con confirmación explícita, historial de operaciones, comprobante consultable/imprimible y múltiples técnicos/emisores.

Esta skill no reemplaza los manuales de ARCA, asesoramiento contable ni las pruebas de homologación. No afirmar que el sistema está listo para producción hasta completar las comprobaciones fiscales, técnicas y operativas descritas aquí.

## Cuándo activarla

Usar esta skill cuando se vaya a crear o modificar cualquiera de estos componentes:

- `lib/arca.ts`, `lib/emitir.ts` o servicios equivalentes de facturación.
- Emisores, CUIT, certificados, autorización de servicios o punto de venta.
- Solicitudes `getLastVoucher`, `createVoucher`, CAE, CAE vencimiento o consulta de comprobantes.
- Estados de pedido, numeración, concurrencia, idempotencia, timeout y conciliación.
- QR fiscal, representación imprimible/PDF o condiciones del receptor.
- Variables de entorno, migraciones o pruebas relacionadas con ARCA.

## Contexto de proyecto y límites

- Framework esperado: Next.js App Router y TypeScript, con ejecución de backend en Node.js.
- Paquete inicialmente previsto: `@afipsdk/afip.js`.
- Persistencia: PostgreSQL.
- Comprobante inicial: Factura C (`CbteTipo = 11`) para un emisor habilitado para ese tipo de comprobante.
- El flujo del bot debe solicitar confirmación antes de emitir.
- No implementar Facturas A/B, notas de crédito ni lectura de lenguaje libre salvo pedido explícito y validación de alcance.
- Tratar `ARCA_ENV=dev` y `ARCA_ENV=prod` como entornos aislados; impedir que un test pueda apuntar accidentalmente a producción.
- Diferenciar el token de acceso de Afip SDK (`AFIPSDK_TOKEN`) del certificado/clave de ARCA y del Ticket de Acceso (TA) administrado por la librería.

## Fuentes primarias que consultar

Antes de codificar o modificar reglas fiscales, revisar las versiones vigentes de estas fuentes:

1. ARCA — Ayuda, homologación, tablas del sistema y manuales de web services: https://www.arca.gob.ar/fe/ayuda/webservice.asp
2. ARCA — Documentación de web services de factura electrónica: https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp
3. Afip SDK — integración Node.js: https://docs.afipsdk.com/integracion/node.js
4. Afip SDK — guía Factura C: https://docs.afipsdk.com/siguientes-pasos/web-services/factura-electronica/factura-c
5. Afip SDK — ir a producción y alta de certificados: revisar la sección vigente desde https://docs.afipsdk.com/
6. Afip SDK — delegar un web service: https://docs.afipsdk.com/recursos/tutoriales-pagina-de-arca/delegar-web-service

Si la documentación oficial cambió, priorizar el manual oficial vigente de ARCA. No copiar códigos fiscales desde blogs, ejemplos antiguos o datos de memoria sin contrastarlos con las tablas/manuales vigentes.

## Protocolo de trabajo obligatorio

### 1. Inspeccionar antes de editar

1. Leer `README`, `package.json`, estructura `app/`, `lib/`, esquema SQL y archivos `.agents/` relevantes.
2. Identificar qué proveedor PostgreSQL se eligió y cómo se ejecutan las migraciones.
3. Leer `.env.example` sin exponer el contenido de `.env`, certificados ni secretos.
4. Buscar llamadas de facturación existentes antes de crear implementaciones duplicadas.
5. Presentar un plan breve y ejecutar cambios pequeños, verificables y compatibles con la estructura real del proyecto.
6. No sobrescribir configuraciones MCP, archivos de entorno, migraciones o lógica ya existente sin inspeccionarlos.

### 2. Resolver primero el modelo de representación fiscal

El proyecto puede manejar varios técnicos/emisores con distintos CUIT. Antes de implementar producción, resolver explícitamente cómo se autorizará cada CUIT:

- **Alternativa delegación:** cada contribuyente delega el servicio web correspondiente al CUIT titular del certificado utilizado por la aplicación, y la delegación queda aceptada según el procedimiento vigente de ARCA.
- **Alternativa certificado por emisor:** cada emisor dispone de certificado/clave y autorización propios.

No asumir que pasar un CUIT diferente al constructor de Afip SDK hace que una credencial tenga autorización para emitir por ese contribuyente. La identidad del certificado, el CUIT representado, el servicio autorizado y el comportamiento real de la librería deben verificarse en homologación.

Crear un spike reproducible antes de implementar emisión multi-CUIT:

1. Configurar el ambiente de homologación.
2. Probar un emisor de prueba con una autorización comprobada.
3. Probar un segundo CUIT con la estrategia de delegación prevista.
4. Registrar qué CUIT usa el certificado, cuál representa la llamada, el servicio autorizado y el resultado de ARCA.
5. Probar lectura del último comprobante, emisión de prueba y lectura del comprobante/CAE.
6. Documentar la decisión y los pasos de onboarding por técnico.

Si el spike falla o la autorización no queda demostrada, detener el paso a producción y diseñar la alternativa; no simular que el caso está resuelto.

### 3. Diseñar límites claros

Mantener separadas estas responsabilidades, adaptándolas a la arquitectura real del repositorio:

- **Adaptador ARCA (`lib/arca.ts`):** crea/configura la instancia del SDK y expone operaciones tipadas: consultar último comprobante, emitir y consultar un comprobante existente.
- **Servicio de emisión (`lib/emitir.ts`):** implementa máquina de estados, idempotencia, bloqueo por emisor/punto de venta/tipo, persistencia de intentos y conciliación.
- **Repositorio de datos:** concentra consultas SQL parametrizadas y transacciones.
- **Dominio de factura:** valida entrada, reglas e importes, sin depender de WhatsApp.
- **Presentación del comprobante:** transforma una factura ya persistida y autorizada en HTML/PDF/QR; no emite comprobantes.

No llamar a ARCA desde componentes cliente ni exponer el SDK, token, certificado o clave al navegador. Usar runtime Node.js si el SDK requiere APIs de Node; comprobar compatibilidad con el hosting elegido y no asumir compatibilidad con Edge Runtime.

### 4. Secretos y configuración

Mantener secretos exclusivamente en variables de entorno del servidor o en un gestor de secretos del proveedor. Crear `.env.example` con nombres y valores vacíos, no con secretos reales.

Variables previstas, adaptando los nombres existentes del proyecto:

```dotenv
ARCA_ENV=dev
AFIPSDK_TOKEN=
ARCA_CERT_B64=
ARCA_KEY_B64=
```

Reglas:

- Validar variables requeridas al inicio de una operación de facturación y fallar con un error de configuración que no revele el secreto.
- Decodificar el certificado y la clave solo en el backend y validar su formato antes de usarlos.
- Nunca registrar tokens, material PEM, claves privadas, cadenas de autenticación, payloads sensibles completos ni cabeceras `Authorization`.
- No introducir secretos en Git, logs, respuestas HTTP, mensajes de WhatsApp, capturas, fixtures ni datos de ejemplo.
- Separar credenciales y datos entre desarrollo/homologación y producción. Cambiar a producción requiere una decisión explícita y checklist aprobado.
- En pruebas automáticas, bloquear la configuración productiva por defecto.

### 5. Modelo de datos y máquina de estados

Alinear el modelo con las migraciones reales del proyecto. Como mínimo, persistir:

- emisores: alias interno, razón social, CUIT, punto de venta, estado activo y datos fiscales estrictamente necesarios;
- pedidos/comprobantes: identificador interno, identificador idempotente de evento de origen, emisor, receptor, tipo/número de documento, condición IVA, concepto, moneda, importes, estado y marcas temporales;
- intento de emisión: número intentado, timestamp, resultado técnico, error normalizado y datos necesarios para conciliar;
- comprobante autorizado: punto de venta, tipo, número, CAE, vencimiento, fecha de emisión y referencia a los datos fiscales emitidos;
- auditoría de acciones administrativas relevantes.

Usar importes `NUMERIC/DECIMAL` en PostgreSQL. No usar cálculos fiscales con `float` binario de JavaScript sin una estrategia decimal explícita. Mantener los documentos CUIT/DNI como cadenas cuando eso evite pérdida de ceros o transformaciones accidentales; convertir a número solo en la frontera que lo exija el SDK y tras validarlos.

Definir estados explícitos, por ejemplo:

- `PENDIENTE`: aún no se autorizó emitir.
- `EN_PROCESO`: emisión reclamada por un worker/proceso.
- `EMITIDA`: existe autorización confirmada y CAE persistido.
- `RECHAZADA`: se confirmó que ARCA rechazó la solicitud, con motivo normalizado.
- `DUDOSA`: el resultado remoto es incierto o hubo una interrupción que no permite asegurar si ARCA emitió.
- `CANCELADA`: se canceló antes de ejecutar la emisión.

Definir transiciones permitidas y restricciones en la base de datos. Nunca permitir `CANCELADA -> EMITIDA` ni repetir `EMITIDA -> emisión`.

### 6. Reglas fiscales y payload WSFEv1

- Confirmar el servicio habilitado: la documentación oficial identifica WSFEv1 como servicio de factura electrónica para comprobantes A, B, C y M sin detalle de ítems, según el alcance aplicable.
- Para Factura C, verificar el código vigente del tipo (`CbteTipo = 11`) y los requisitos aplicables al CUIT emisor.
- Validar tipo y número de documento del receptor con las tablas vigentes de ARCA; no inferir que un documento es válido solo por longitud.
- Validar `CondicionIVAReceptorId` y su obligatoriedad según el régimen y la fecha de emisión. La regla/código debe provenir de la documentación vigente, no de una constante histórica no verificada.
- Cuando `Concepto` sea servicios o productos/servicios, incluir los campos de fechas de servicio y vencimiento de pago cuando el manual los exija. Calcular fechas en `America/Argentina/Buenos_Aires` y convertirlas al formato que requiera WSFEv1.
- Comprobar que `ImpTotal`, `ImpNeto`, `ImpTotConc`, `ImpOpEx`, `ImpIVA` e `ImpTrib` concuerden con el tipo de comprobante y el manual. No suponer que todo importe es siempre `ImpNeto = ImpTotal` si aparecen conceptos adicionales.
- Validar moneda y cotización; no usar cotizaciones o códigos arbitrarios.
- Validar los límites y relaciones de CUIT, punto de venta, tipo de comprobante y número de comprobante antes de llamar al servicio.
- Tratar respuestas de autorización como datos fiscales persistentes: guardar CAE y vencimiento devueltos por el servicio. No construir ni inventar esos valores.
- Crear el QR usando el formato y URL del manual oficial vigente. No considerar una URL vieja de ejemplo como autoridad normativa; probar el QR resultante con datos de homologación y confirmar sus campos.
- Si el requisito fiscal, código o condición del receptor no está claro, documentar la duda, consultar el manual vigente y bloquear la emisión hasta resolverla.

### 7. Numeración, concurrencia e idempotencia

La API remota de ARCA y la base de datos no comparten una transacción ACID. Diseñar para interrupciones en cualquier punto.

- Mantener unicidad para el identificador idempotente del evento que originó el pedido.
- La clave de numeración se debe definir al menos por emisor/CUIT, punto de venta y tipo de comprobante.
- Aplicar un mecanismo transaccional de exclusión por esa clave (por ejemplo, advisory lock correctamente diseñado, fila de control bloqueada o una cola serializada por emisor). Verificar el alcance del bloqueo y evitar confiar en bloqueos locales de una sola instancia.
- No asumir que `SELECT último número + 1` es seguro sin exclusión mutua y reconciliación.
- Registrar el intento antes de llamar al servicio remoto y asegurar que pueda recuperarse tras caída del proceso.
- Si la solicitud falla de forma claramente rechazada por ARCA, registrar la respuesta y el error normalizado.
- Si hay timeout, conexión interrumpida, respuesta ilegible o caída después del envío, marcar `DUDOSA`. No repetir automáticamente la creación del comprobante.
- Ante `DUDOSA`, consultar el último comprobante y/o la consulta de comprobante del servicio, usando el número intentado, punto de venta, tipo, emisor, importe y receptor. Conciliar antes de tomar una decisión.
- Si no se puede determinar con confianza si el comprobante existe, mantenerlo en estado de revisión manual. No cambiar una duda por una nueva emisión automática.
- Contemplar caída después de que ARCA devuelve CAE pero antes del `COMMIT`: la tarea de conciliación debe poder descubrir el comprobante remoto y completar el registro local sin volver a emitirlo.
- Evitar mantener una transacción de larga duración abierta indefinidamente alrededor de una llamada remota. Documentar la estrategia de exclusión y los límites de tiempo, con un mecanismo de recuperación.

### 8. Confirmación de emisión

La capa de dominio de ARCA solo debe recibir una orden válida desde el flujo autorizado. Antes de invocarla, el servicio debe comprobar:

1. el pedido existe y pertenece al usuario autorizado;
2. el emisor está activo y el usuario puede facturar por ese emisor;
3. el pedido está en un estado que permite confirmar;
4. la confirmación está vinculada a ese pedido y sigue vigente;
5. el pedido no fue procesado anteriormente;
6. monto, documento, condición IVA, concepto, punto de venta y emisor pasaron validación;
7. el monto no supera el límite configurado;
8. el ambiente de ARCA es el esperado.

La confirmación por texto `SI` no debe confirmar cualquier pedido sin contexto. Vincularla al pedido pendiente válido del emisor/usuario y aplicar expiración y protección contra mensajes duplicados.

### 9. Errores y observabilidad

- Normalizar los errores técnicos y respuestas de ARCA en una estructura interna; preservar los códigos/mensajes originales solo cuando sea seguro y útil para auditoría.
- Separar rechazo funcional, error de configuración, límite/timeout de proveedor y resultado incierto.
- No enviar trazas, SQL, tokens, certificados o mensajes internos detallados a técnicos por WhatsApp.
- Registrar correlation ID del pedido, identificador interno, entorno, operación y duración; ocultar DNI/CUIT completos e información sensible en logs generales.
- Crear alerta operativa para pedidos `DUDOSA`, certificado próximo a vencimiento, errores de autenticación, fallos persistentes y cola atascada.
- Implementar un proceso administrativo de conciliación y permitir revisión con auditoría; restringirlo por permisos.

### 10. Pruebas requeridas

Implementar tests unitarios, de integración y de contrato donde sea viable. Incluir al menos:

- validación de CUIT/CUIL/DNI según reglas verificadas;
- condición IVA admitida y rechazada, incluyendo cambios normativos/versiones;
- importe malformado, negativo, cero, exceso de límite y redondeo decimal;
- servicio con fechas requeridas y producto sin fechas que no correspondan;
- respuesta autorizada con CAE y vencimiento persistidos;
- rechazo real de homologación clasificado como `RECHAZADA`;
- timeout o conexión cortada clasificados como `DUDOSA` sin reemisión automática;
- caída después de respuesta remota antes de persistencia, recuperada por conciliación;
- dos solicitudes concurrentes del mismo emisor/punto de venta/tipo sin asignación duplicada;
- solicitudes paralelas de emisores distintos sin bloqueo innecesario global;
- duplicado del mismo evento sin segunda emisión;
- usuario no habilitado para el emisor, emisor inactivo y monto por encima del máximo;
- entorno productivo bloqueado en pruebas por defecto.

Usar homologación y credenciales de prueba para las pruebas de extremo a extremo. Nunca ejecutar pruebas destructivas ni generar comprobantes reales en producción como parte de un test automatizado.

### 11. Pasaje a producción

No marcar la tarea completa hasta comprobar y documentar:

- [ ] Manual WSFEv1 vigente revisado y códigos fiscales actualizados.
- [ ] CUIT emisor, certificado, servicio autorizado y punto de venta verificados.
- [ ] Estrategia multi-CUIT probada para al menos dos emisores de homologación; decisión documentada.
- [ ] Casos de Factura C probados con los datos fiscales necesarios.
- [ ] CAE y vencimiento recibidos, persistidos y reconciliables.
- [ ] Idempotencia, concurrencia y estado `DUDOSA` probados.
- [ ] Comprobante imprimible y QR contrastados contra el manual oficial.
- [ ] Secretos productivos guardados en un gestor seguro y fuera del repositorio.
- [ ] Plan de monitorización, respaldo, rotación de certificados y respuesta ante incidentes.
- [ ] Piloto controlado aprobado por un responsable antes de habilitar todos los emisores.

## Entregables que el agente debe producir

Cuando se solicite implementar esta integración, devolver:

1. resumen de arquitectura y decisiones pendientes;
2. cambios concretos por archivo y migraciones;
3. pruebas agregadas y comandos ejecutados;
4. variables de entorno documentadas sin secretos;
5. pasos manuales para homologación/ARCA que no puedan automatizarse;
6. riesgos no resueltos, en especial autorización multi-CUIT y operaciones `DUDOSA`.

No afirmar que se emitió un comprobante real o que se validó el CAE si no se verificó mediante una respuesta real de ARCA en el ambiente declarado.
