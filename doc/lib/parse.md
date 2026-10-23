# Parser del mensaje

## Descripción

`lib/parse.ts` interpreta los mensajes del usuario para convertir texto estructurado en un pedido de facturación.

## Formato de entrada

Se define un formato fijo separado por `|` para reducir ambigüedad y fallos.

```text
monto | nombre_cliente | dni_o_cuit | tecnico
```

Ejemplo:

```text
15000 | Juan Pérez | 30123456 | marcos
```

## Reglas de parseo

- El monto debe ser numérico y estar dentro del rango permitido.
- El nombre del cliente se toma como texto libre, sin usar el nombre del técnico.
- El documento del cliente puede ser DNI o CUIT.
- El técnico se resuelve contra la tabla de emisores e identificadores válidos.
- Debe validarse que el alias del técnico exista y esté activo.

## Errores esperados

- Monto no numérico o fuera de rango.
- Documento inválido.
- Técnico no existente o no autorizado.
- Faltan campos o hay un formato incorrecto.

## Resultado

El parser debe devolver un objeto tipado con el pedido validado y listo para confirmación o emisión.
