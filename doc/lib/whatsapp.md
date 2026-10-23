# Mensajería de WhatsApp

## Descripción

`lib/whatsapp.ts` se encarga del envío de mensajes, confirmaciones y respuestas del bot a través de la Meta Cloud API.

## Funciones previstas

- Enviar mensaje de bienvenida o solicitud de datos.
- Mostrar resumen del pedido antes de la emisión.
- Pedir confirmación con `SI` o `NO`.
- Informar el resultado final con CAE, vencimiento y enlace del comprobante.

## Reglas de negocio

- Los mensajes deben ser cortos y accionables.
- Cada respuesta debe indicar claramente el estado del pedido.
- Deben enviarse sólo ante mensajes provenientes de teléfonos autorizados.

## Seguridad

- Validar que el número del remitente esté en la lista de usuarios activos.
- No responder automáticamente a mensajes de clientes no autorizados.
- No exponer datos sensibles ni el CAE en mensajes no requeridos.
