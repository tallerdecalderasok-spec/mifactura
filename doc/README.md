# Documentación técnica del proyecto

Esta carpeta reúne la arquitectura y documentación técnica por módulo. Las especificaciones de producto e implementación están separadas en [`spec/`](../spec/README.md). El repositorio todavía contiene documentación, no el código de la aplicación.

## Resumen del sistema

El bot recibe una solicitud estructurada por WhatsApp (la gramática final se definirá en la Fase 0), valida que el teléfono esté autorizado, pide confirmación, emite una Factura C con el CUIT del técnico elegido y devuelve un comprobante consultable con QR.

## Reglas críticas

- El emisor es el técnico, no la empresa.
- Debe existir validación multi-CUIT con ARCA en homologación antes de producción.
- Requiere confirmación explícita por `SI`.
- La recepción de webhook debe persistirse durablemente antes de responder aceptación.
- Debe coordinar numeración por emisor/CUIT, punto de venta y tipo de comprobante.
- Debe ser idempotente por `wa_message_id`.
- Debe registrar estados y errores para auditoría.

## Documentos principales

- [Índice de specs](../spec/README.md): organización por fase y forma de implementar tareas.
- [Especificación general](../spec/project-spec.md): requisitos y decisiones vigentes.
- [Roadmap de implementación](../spec/implementation-plan.md): tareas, dependencias y aceptación.
- [architecture.md](./architecture.md): flujo end-to-end y responsabilidades.
- [Especificación original](../Bot%20de%20facturación%20por%20WhatsApp%20%28Factura%20C%29%20%E2%80%93%20Next.js%20+%20Afip%20SDK.md): referencia histórica no validada como implementación.

## Documentación por módulo

### App Router

- [app/README.md](./app/README.md): endpoints y responsabilidades HTTP.
- [app/webhook.md](./app/webhook.md): handshake, firma y recepción de eventos Meta.
- [app/comprobante.md](./app/comprobante.md): vista pública/imprimible del comprobante.

### Lógica de negocio e integraciones

- [lib/README.md](./lib/README.md): responsabilidades y relación entre módulos.
- [lib/parse.md](./lib/parse.md): formato y validación de la solicitud.
- [lib/bot.md](./lib/bot.md): conversación, confirmación y cancelación.
- [lib/emitir.md](./lib/emitir.md): emisión, estados, concurrencia y resultados inciertos.
- [lib/arca.md](./lib/arca.md): adaptador ARCA/Afip SDK y homologación.
- [lib/whatsapp.md](./lib/whatsapp.md): mensajes Cloud API.
- [lib/qr.md](./lib/qr.md): QR y datos del comprobante.

### Persistencia

- [db/README.md](./db/README.md): entidades y restricciones principales.
- [db/schema.md](./db/schema.md): esquema y estados conceptuales.

## Mapa de módulos

```text
doc/
├── README.md            # índice y orden de lectura
├── architecture.md      # flujo end-to-end y responsabilidades
├── app/
│   ├── README.md        # endpoints webhook y comprobante
│   ├── webhook.md       # validación HMAC + Meta
│   └── comprobante.md  # vista pública del comprobante
├── lib/
│   ├── README.md        # lógica de negocio principal
│   ├── parse.md         # parsing del pedido
│   ├── bot.md           # conversación y confirmación
│   ├── emitir.md        # emisión, estados y concurrencia
│   ├── arca.md          # integración con Afip SDK / ARCA
│   ├── whatsapp.md      # mensajes de respuesta
│   ├── qr.md            # QR y comprobante imprimible
├── db/
│   ├── README.md        # entidades y restricciones
│   └── schema.md        # esquema conceptual y estados
```

## Orden de lectura recomendado

1. [Índice de specs](../spec/README.md) si vas a definir o implementar una tarea.
2. [architecture.md](./architecture.md) para el diseño transversal.
3. [app/README.md](./app/README.md), [lib/README.md](./lib/README.md) y [db/README.md](./db/README.md) para profundizar por módulo.

## Cuando seguir leyendo

- Si querés entender el webhook: [app/webhook.md](./app/webhook.md)
- Si querés entender la emisión: [lib/emitir.md](./lib/emitir.md)
- Si querés entender ARCA: [lib/arca.md](./lib/arca.md)
- Si querés entender el modelo de datos: [db/schema.md](./db/schema.md)

## Referencias

- [README del proyecto](../README.md)
- [AGENTS.md](../AGENTS.md)
- [Índice de specs](../spec/README.md)
- [Especificación funcional](../Bot%20de%20facturación%20por%20WhatsApp%20%28Factura%20C%29%20%E2%80%93%20Next.js%20+%20Afip%20SDK.md)
- [Arquitectura del sistema](./architecture.md)
- [Skill de ARCA](../.agents/skills/arca-facturacion-electronica/SKILL.md)
- [Skill de WhatsApp](../.agents/skills/whatsapp-cloud-api-bot/SKILL.md)
