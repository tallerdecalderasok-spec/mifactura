# Emisión de facturas

## Descripción

`lib/emitir.ts` encapsula la lógica de transacción para emitir una Factura C, controlando el estado del pedido y la numeración del punto de venta.

## Objetivos

- Validar que el pedido esté en un estado permitido.
- Bloquear y reservar una numeración del punto de venta.
- Llamar a ARCA usando el CUIT del emisor técnico.
- Actualizar el registro del pedido con CAE, número y fecha de vencimiento.

## Reglas críticas

- Debe existir un único punto de venta exclusivo para el bot por emisor.
- Los pedidos no pueden emitirse en paralelo con el mismo `pto_vta` sin lock o transacción.
- Si ARCA responde `DUDOSA`, el pedido debe quedarse en estado `DUDOSA` con trazabilidad.
- Si se rechaza un pedido, se debe guardar el error en la base de datos.

## Estados finales

- `EMITIDA`: comprobante validado y con CAE.
- `RECHAZADA`: error de validación o rechazo del servicio.
- `DUDOSA`: respuesta incierta, requiere revisión.
- `CANCELADA`: emisión no confirmada o cancelada por el usuario.

## Seguridad de concurrencia

Se recomienda usar transacciones y locks de base de datos para asegurar que dos procesos no asignen la misma numeración.
