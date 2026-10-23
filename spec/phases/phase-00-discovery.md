# Fase 0 — Decisiones y viabilidad

**Estado:** pendiente. No iniciar integración productiva.  
**Tareas:** T01–T03 del [roadmap](../implementation-plan.md).  
**Reglas comunes:** [especificación general](../project-spec.md).

## Objetivo

Cerrar decisiones que afectan los contratos y demostrar viabilidad técnica/fiscal multi-CUIT en homologación antes de construir el flujo de emisión.

## T01 — Cerrar decisiones de producto y normativa

### Alcance

- Definir gramática exacta del pedido y los campos obligatorios/opcionales.
- Acordar cómo capturar y validar los datos fiscales del receptor, incluida condición IVA, usando fuentes oficiales vigentes.
- Confirmar alcance MVP: Factura C por servicios; productos/repuestos, A/B, notas de crédito y lenguaje libre quedan fuera.
- Definir descripción del servicio, límites de monto, expiración de pedidos y política de selección de emisor.
- Definir roles y método de alta/administración de usuarios y emisores.
- Acordar datos, privacidad, expiración y protección del comprobante público.

### Criterios de aceptación

- Las decisiones de negocio quedan aprobadas y escritas en la especificación.
- No se fijan códigos fiscales ni campos WSFE por ejemplos históricos o fuentes no oficiales.
- Lo que dependa de autoridad externa sin comprobar queda como bloqueador explícito.

## T02 — Spike de ARCA multi-CUIT

### Precondiciones

- CUITs y credenciales de prueba autorizados para homologación.
- Caso fiscal acordado en T01.

### Alcance

- Documentar por prueba: CUIT titular del certificado, CUIT representado, servicio autorizado, ambiente, punto de venta y versión/operación Afip SDK.
- Probar autenticación y consulta de último comprobante.
- Probar con al menos dos emisores de prueba el modelo de delegación; si no es viable, evaluar certificado/autorización por emisor.
- Emitir comprobante únicamente en homologación y verificar consulta/CAE remoto.
- Registrar pasos manuales de onboarding y resultados reproducibles.

### Criterios de aceptación

- La evidencia distingue identidad del certificado de contribuyente representado.
- La autorización fiscal es demostrada en homologación; configurar un CUIT en el SDK no se considera prueba suficiente.
- La decisión multi-CUIT y onboarding quedan documentados.
- Si no se demuestra, T11/T12 para el modelo propuesto quedan bloqueadas; no se simula éxito.
- Ninguna llamada de prueba alcanza producción.

## T03 — Elegir arquitectura operativa

### Alcance

- Elegir runtime Node, hosting, modalidad de conexión/migraciones de Supabase y gestión de secretos. Supabase PostgreSQL ya está elegido.
- Elegir mecanismo durable de worker/cola e inbox/outbox con redrive.
- Definir límites de ejecución, estrategia de coordinación de numeración, dominio HTTPS y observabilidad.

### Criterios de aceptación

- El diseño demuestra que un webhook aceptado sobrevive al reinicio del proceso.
- Se conocen límites de runtime y ejecución de worker/tareas.
- No se depende de una promesa en memoria como única garantía de procesamiento.
- D-05 (salvo la selección de Supabase PostgreSQL ya confirmada) y D-09 de la [especificación general](../project-spec.md#14-decisiones-pendientes--bloqueadores) quedan resueltas o explícitamente bloqueadas.

## Salida de fase

T01–T03 cuentan con decisiones/evidencia; las dependencias sin resolver quedan identificadas antes de implementar las superficies afectadas.

## No incluye

Crear el bot, migraciones o webhook productivo; emitir facturas reales; aceptar delegación multi-CUIT como cierta sin prueba.
