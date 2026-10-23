# QR y comprobante imprimible

## Descripción

`lib/qr.ts` se encarga de generar o enlazar el QR y la vista del comprobante emitido.

## Objetivos

- Generar un URL pública para consultar el comprobante.
- Incluir un QR o código asociado a la factura.
- Mantener la vista imprimible y legible para el cliente.

## Reglas clave

- El enlace debe ser público pero protegido por un identificador firmado o secreto si es necesario.
- El código QR debe ser verificable y estar asociado al comprobante real emitido.
- Debe existir una ruta de visualización (`app/f/[id]/route.ts`) que presente el resultado definitivo.

## Resultado esperado

El cliente debe poder consultar el comprobante emitido desde un link o escaneando un QR y ver los datos básicos del comprobante con estilo imprimible.
