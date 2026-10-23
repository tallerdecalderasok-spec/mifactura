# Integración con ARCA / Afip SDK

## Descripción

`lib/arca.ts` encapsula la interacción con `@afipsdk/afip.js` y los web services de ARCA.

## Funcionalidad esperada

- Generar el token de autenticación WSAA.
- Usar el certificado y clave privada configurados por entorno.
- Emplear el CUIT del emisor técnico activo en la factura.
- Enviar la solicitud de `Factura C` y recibir el CAE y vencimiento.

## Consideraciones de implementación

- La solución debe comprobar si `tax_id` / CUIT del emisor representado puede usarse con la app certificate.
- Si la homologa no permite la delegación del servicio, se debe implementar la estrategia por certificado por técnico.
- Debe existir manejo claro para errores de WSAA, WSFE y respuestas incoherentes.

## Importante

El punto crítico del proyecto es la facturación por varios técnicos con distintos CUIT. Antes de producir se debe validar este comportamiento en homologación con dos CUIT reales de testing.
