# Lógica del bot

## Descripción

`lib/bot.ts` coordina el flujo conversacional del asistente: recepción del pedido, validación, pregunta de confirmación y respuesta final.

## Estados del flujo

- Pedido recibido.
- Validación del formato y teléfono.
- Confirmación previa del usuario.
- Envío a emisión.
- Resultado final: emitida, rechazada, dudosa o cancelada.

## Comandos que debe manejar

- Pedido de factura con formato estructurado.
- Confirmación con `SI` o `NO`.
- Cancelación explícita del proceso.
- Validación de autorización de usuario/emisor.

## Reglas de UX

- Mostrar el resumen del comprobante antes de emitir.
- Pedir confirmación antes de invocar ARCA.
- Mantener un registro del último estado por pedido.
- Mantener respuesta breve y accionable.

## Resultado esperado

El bot debe evitar facturas por error y garantizar que el usuario confirme antes del envío final.
