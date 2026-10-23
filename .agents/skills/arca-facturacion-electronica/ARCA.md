mkdir -p .agents/skills/arca-facturacion-whatsapp

cat > .agents/skills/arca-facturacion-whatsapp/SKILL.md <<'EOF'
---
name: arca-facturacion-whatsapp
description: Aplica las reglas de seguridad, idempotencia, PostgreSQL y facturación electrónica ARCA a las modificaciones del bot de facturas C.
---

# Reglas del proyecto

## Seguridad
- Validar X-Hub-Signature-256 sobre el cuerpo crudo del webhook.
- Respetar la lista blanca de teléfonos y la relación usuario-emisor.
- Exigir confirmación explícita antes de emitir una factura.
- Nunca exponer certificados, claves privadas ni tokens en logs,
  respuestas, documentación pública o control de versiones.
- No emitir comprobantes reales durante pruebas automatizadas.

## Integridad fiscal
- No asumir que la delegación entre CUIT funciona: verificarla
  en homologación antes de habilitar producción.
- Consultar los manuales vigentes de ARCA para códigos fiscales,
  condición IVA del receptor, QR y requisitos del comprobante.
- No inventar respuestas, CAE, números de comprobante ni vencimientos.
- Mantener separadas homologación y producción.

## Concurrencia e idempotencia
- Impedir el procesamiento duplicado por wa_message_id.
- Serializar la numeración por CUIT, punto de venta y tipo
  de comprobante.
- Mantener transacciones y restricciones de base de datos coherentes.
- No repetir automáticamente una emisión cuando el resultado
  de ARCA sea incierto.

## Errores y reconciliación
- Marcar como DUDOSA una operación cuyo resultado sea incierto.
- Antes de reintentar, consultar ARCA para determinar si el
  comprobante ya existe y comprobar que sus datos coincidan.
- Registrar los estados y errores sin almacenar secretos.

## Cambios de código
- Revisar efectos sobre numeración, CAE, datos personales y permisos.
- Agregar pruebas para duplicados, concurrencia, timeouts,
  confirmación y acceso no autorizado.
- No declarar listo para producción un código que no haya sido
  contrastado con homologación y las pruebas de aceptación.
EOF