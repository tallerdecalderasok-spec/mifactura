# Ruta pública del comprobante

## Descripción

`app/f/[id]/route.ts` genera la vista de un comprobante emitido para que pueda consultarse desde un enlace público y compartir QR.

## Objetivo

- Mostrar la factura o comprobante emitido.
- Proveer un acceso legible y verificable para el cliente o el técnico.
- Incluir los datos necesarios para la validación de la emisión.

## Datos esperados

- Identificador del pedido.
- Número de comprobante.
- CAE.
- Fecha de vencimiento.
- Cliente y datos del emisor.
- Total, concepto y CUIT del responsable de la emisión.
- Link externo o URL con QR.

## Patrón de render

- Buscar el registro del comprobante en la base de datos.
- Validar la firma o token de acceso si se usa una URL compartible.
- Generar HTML con estilo mínimo y legible.
- Incluir un QR oficial o un QR interno apuntando a la vista del comprobante.

## Reglas de seguridad

- Evitar exposición de información sensible innecesaria.
- No permitir enumerar comprobantes arbitrarios.
- Si el comprobante es confidencial, usar un identificador firmado o secreto.

## Resultado esperado

La ruta debe devolver una página HTML útil para impresión, consulta o validación del comprobante.
