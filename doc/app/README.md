# Módulo `app/`

## Propósito

Contiene la capa de entrada HTTP de la aplicación Next.js.

## Archivos esperados

- `app/api/whatsapp/route.ts`: webhook de entrada para mensajes de WhatsApp.
- `app/f/[id]/route.ts`: ruta pública para ver un comprobante emitido.

## Responsabilidades

### Webhook

- Verificar la firma HMAC del payload recibido por Meta.
- Validar el token y el tipo de evento.
- Persistir el evento aceptado de forma durable y deduplicarlo antes de responder `200 OK`.
- Derivar procesamiento a un worker durable; no depender solo de ejecución en memoria después del response.

### Comprobante público

- Buscar el pedido por `id` o identificador firmado.
- Recuperar la información del comprobante.
- Generar la vista HTML con el CAE, datos del comprobante y QR.

## Reglas de seguridad

- Validar la firma sobre el cuerpo raw antes de parsear JSON.
- Rechazar payloads no autorizados.
- No aceptar mensajes si el remitente no se encuentra en la lista de teléfonos habilitados.

## Flujo de uso

```text
POST /api/whatsapp
  -> validación de firma
  -> parseo del mensaje
  -> persistencia durable del evento
  -> respuesta 200 a Meta
  -> worker procesa comando y pedido
  -> respuesta por outbox a WhatsApp
```

```text
GET /f/[id]
  -> cargar comprobante
  -> armar vista HTML
  -> incluir QR y datos principales
```
