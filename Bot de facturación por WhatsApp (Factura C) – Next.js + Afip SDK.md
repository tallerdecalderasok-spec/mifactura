# Bot de facturación por WhatsApp (Factura C) con Next.js y Afip SDK

Documento de implementación · Versión 1 · 23/10/2026

## 1. Qué vamos a construir

Un bot de WhatsApp para que los técnicos de la empresa pidan facturas C escribiendo un mensaje. El sistema valida el pedido, pide confirmación, solicita el CAE a ARCA con el **CUIT del técnico elegido** y responde con el comprobante.

Ejemplo de uso:

```
Técnico  → factura 15000 | Juan Pérez | 30123456 | marcos
Bot      → Factura C · Emite: Marcos Gómez (20-xxxxxxxx-x)
           Cliente: Juan Pérez · DNI 30123456 · Total $15000.00
           Respondé SI para emitir o NO para cancelar.
Técnico  → si
Bot      → Factura C 0003-00000045 emitida. CAE: 7412... Vto: 2026-11-02
           Comprobante: https://tu-app.com/f/...
```

Campos del pedido: **monto, nombre del cliente, DNI o CUIT, técnico**. Interpreté “a nombre de quién” como el técnico cuyo CUIT emite la factura. El nombre del cliente va aparte.

**Alcance v1:** emitir Factura C (monotributistas), varios técnicos con CUIT propio, confirmación previa, historial en base de datos, comprobante imprimible con QR.

**Fuera de alcance v1:** notas de crédito, Facturas A/B (responsables inscriptos), reportes, lectura de lenguaje libre con IA.

## 2. Decisiones de diseño

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Framework | Next.js (App Router) con rutas API | Un solo proyecto para webhook, lógica y comprobante |
| ARCA | `@afipsdk/afip.js` | Arranque rápido, maneja WSAA y el caché del ticket |
| Mensaje | Formato fijo separado por `\|` | Es predecible. Una IA para texto libre puede venir en v2 |
| Seguridad | Lista blanca de teléfonos y confirmación con SI | Evita facturas por error o por números ajenos |
| Base de datos | Postgres | Necesitamos transacciones y bloqueo por punto de venta |
| Hosting | VPS/Docker, o Vercel con `maxDuration` alto | ARCA a veces tarda varios segundos |

## 3. Punto crítico: facturar por varios técnicos

Cada factura tiene que salir con el CUIT del técnico que presta el servicio. Hay dos formas de lograrlo:

**Opción A — Delegación (recomendada).** La app tiene un solo certificado (el de la empresa o el tuyo). Cada técnico, desde su clave fiscal, delega el servicio de Facturación Electrónica a ese CUIT. Es el modelo que usan las plataformas de facturación: el certificado lo maneja la plataforma y el contribuyente solo da permiso. Ventaja: el técnico no toca certificados.

**Opción B — Un certificado por técnico.** Cada uno genera su certificado y lo autoriza al servicio `wsfe`. Funciona, pero es mucho más trabajo de onboarding y hay que guardar N claves privadas.

> **Punto abierto n.º 1 (validar antes de escribir más código):** confirmar en homologación que Afip SDK permite usar el certificado de la app con el CUIT del técnico como emisor representado. La API REST de Afip SDK recibe un campo `tax_id` (CUIT a utilizar) separado del certificado, lo que sugiere que sí, pero hay que probarlo con dos CUIT reales de testing. Si no se puede, se usa la Opción B.

**Requisitos por cada técnico:**

- Ser monotributista (si es responsable inscripto emite A/B, no C).
- Clave fiscal.
- Un punto de venta de tipo **“Factura electrónica – Monotributo – Web Services”**. No sirven los de “Factura en línea” ni “Comprobantes en línea”.
- Usar un **punto de venta exclusivo para el bot**. Si se factura desde otro sistema con el mismo punto de venta, la numeración se desfasa.
- Delegar el servicio (Opción A) o autorizar su certificado (Opción B).

## 4. Checklist previo

**ARCA**

- [ ] Certificado de testing y servicio `wsfe` autorizado en homologación.
- [ ] Certificado de producción y `wsfe` autorizado.
- [ ] Por técnico: punto de venta Web Services creado y delegación aceptada.

**Afip SDK**

- [ ] Cuenta en app.afipsdk.com y `access_token` (obligatorio para producción). Revisar planes y límites: no los verifiqué.

**Meta (WhatsApp Cloud API)**

- [ ] App de Meta con producto WhatsApp, número de teléfono y token permanente.
- [ ] Webhook configurado con campo `messages` suscripto.
- [ ] Dominio público con HTTPS.

**Cambio normativo (RG 5616/2024):** desde el 1 de diciembre de 2026 ARCA rechaza comprobantes sin la condición frente al IVA del receptor (`CondicionIVAReceptorId`). Este diseño ya lo incluye.

## 5. Arquitectura

```
WhatsApp ──► Meta Cloud API ──► POST /api/whatsapp (Next.js)
                                   │ 1. valida firma HMAC
                                   │ 2. responde 200 rápido
                                   ▼ 3. procesa en segundo plano
                           lib/bot.ts (comandos)
                              │            │
                 Postgres ◄───┘            └──► lib/emitir.ts ──► Afip SDK ──► ARCA (WSAA + WSFEv1)
                 (usuarios, emisores,                │
                  pedidos, CAE)                      ▼
                                             respuesta por WhatsApp
```

## 6. Proyecto, variables y base de datos

**Estructura**

```
app/api/whatsapp/route.ts   webhook (GET verificación, POST mensajes)
app/f/[id]/route.ts         comprobante imprimible con QR
lib/db.ts                   pool de Postgres
lib/parse.ts                lee el mensaje de pedido
lib/bot.ts                  lógica de comandos
lib/emitir.ts               transacción, bloqueo y estados
lib/arca.ts                 llamadas a Afip SDK
lib/whatsapp.ts             envío de mensajes
lib/qr.ts                   URL del QR oficial
```

**Variables de entorno**

```
DATABASE_URL=
AFIPSDK_TOKEN=
ARCA_ENV=dev                 # dev | prod
ARCA_CERT_B64=               # certificado en base64
ARCA_KEY_B64=                # clave privada en base64
WA_PHONE_ID=
WA_TOKEN=
WA_APP_SECRET=               # para validar la firma del webhook
WA_VERIFY_TOKEN=             # solo para el handshake inicial
WA_GRAPH_VERSION=            # versión vigente de Graph API
APP_BASE_URL=https://tu-dominio.com
LINK_SECRET=                 # firma de links a comprobantes
MONTO_MAXIMO=500000          # tope por factura
```

**Esquema SQL**

```sql
create table emisores (
  id serial primary key,
  alias text unique not null,            -- 'marcos' (minúsculas)
  razon_social text not null,
  cuit bigint unique not null,
  pto_vta int not null,
  domicilio text, iibb text, inicio_actividades date,
  activo boolean not null default true
);

create table usuarios (
  telefono text primary key,             -- formato internacional sin +
  nombre text not null,
  activo boolean not null default true
);

create table usuario_emisor (
  telefono text references usuarios,
  emisor_id int references emisores,
  primary key (telefono, emisor_id)
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  wa_message_id text unique not null,    -- idempotencia
  telefono text not null,
  emisor_id int not null references emisores,
  receptor_nombre text not null,
  doc_tipo int not null,                 -- 80 CUIT, 96 DNI
  doc_nro text not null,
  cond_iva_receptor int not null,
  monto numeric(14,2) not null,
  concepto int not null default 2,       -- 1 productos, 2 servicios
  cbte_tipo int not null default 11,     -- Factura C
  estado text not null default 'PENDIENTE',
  -- PENDIENTE | EMITIDA | RECHAZADA | DUDOSA | CANCELADA
  cbte_nro_intento bigint,
  cbte_nro bigint, cae text, cae_vto text,
  error text,
  creado timestamptz not null default now(),
  emitido timestamptz,
  unique (emisor_id, cbte_tipo, cbte_nro)
);
```

## 7. Código base

Es un esqueleto para implementar y ajustar, no código listo para producción. Los métodos de `db.*` son consultas SQL simples que faltan escribir.

### 7.1 Webhook de WhatsApp: `app/api/whatsapp/route.ts`

Meta verifica el webhook con un GET y firma cada POST con `X-Hub-Signature-256` (HMAC-SHA256 del cuerpo crudo con el App Secret). Hay que validar sobre el texto crudo, antes de parsear el JSON.

```ts
import { after } from 'next/server';
import crypto from 'node:crypto';
import { handleIncoming } from '@/lib/bot';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === process.env.WA_VERIFY_TOKEN) {
    return new Response(p.get('hub.challenge') ?? '', { status: 200 }); // valor crudo, no JSON
  }
  return new Response('Forbidden', { status: 403 });
}

function firmaValida(raw: string, header: string | null) {
  if (!header) return false;
  const esperado = 'sha256=' + crypto.createHmac('sha256', process.env.WA_APP_SECRET!).update(raw).digest('hex');
  const a = Buffer.from(esperado), b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!firmaValida(raw, req.headers.get('x-hub-signature-256'))) {
    return new Response('Forbidden', { status: 403 });
  }
  const body = JSON.parse(raw);
  const mensajes = (body.entry ?? []).flatMap((e: any) =>
    (e.changes ?? []).flatMap((c: any) => c.value?.messages ?? []));

  // Responder 200 enseguida; ARCA puede tardar y Meta reintenta si no contestamos rápido.
  after(async () => {
    for (const m of mensajes) await handleIncoming(m).catch(console.error);
  });
  return new Response('ok', { status: 200 });
}
```

### 7.2 Lectura del pedido: `lib/parse.ts`

Formato: `factura monto | nombre | DNI o CUIT | técnico | condición`. El técnico es opcional si el usuario tiene un solo emisor. La condición (`CF`, `RI`, `MONO`, `EXENTO`) es opcional para DNI (se asume consumidor final) y obligatoria para CUIT.

```ts
export type Pedido = {
  monto: number; nombre: string;
  docTipo: 80 | 96; docNro: string;
  condIva: number;            // CondicionIVAReceptorId
  emisorAlias?: string;
};

// Códigos habituales. Confirmar la tabla completa con los parámetros de ARCA en homologación.
const COND: Record<string, number> = { cf: 5, ri: 1, mono: 6, exento: 4 };

export function cuitValido(c: string) {
  if (c.length !== 11) return false;
  const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const s = w.reduce((a, x, i) => a + x * Number(c[i]), 0);
  const r = 11 - (s % 11);
  const dv = r === 11 ? 0 : r === 10 ? 9 : r;
  return dv === Number(c[10]);
}

// Acepta 15000, 15.000 y 15.000,50. Sin coma, los puntos son separador de miles.
export function parseMonto(s: string) {
  const t = s.replace(/[^0-9.,]/g, '');
  const n = t.includes(',')
    ? Number(t.replace(/[.]/g, '').replace(',', '.'))
    : Number(t.replace(/[.]/g, ''));
  return Math.round(n * 100) / 100;
}

export function parsePedido(text: string): Pedido | { error: string } {
  const partes = text.trim().slice('factura'.length).split('|').map(s => s.trim());
  const [montoRaw, nombre, docRaw, ...resto] = partes;
  if (!montoRaw || !nombre || !docRaw) return { error: 'faltan datos' };

  const monto = parseMonto(montoRaw);
  if (!Number.isFinite(monto) || monto <= 0) return { error: 'monto inválido' };
  if (nombre.length < 3) return { error: 'nombre del cliente muy corto' };

  const docNro = docRaw.replace(/[^0-9]/g, '');
  let docTipo: 80 | 96;
  if (docNro.length === 11) {
    if (!cuitValido(docNro)) return { error: 'CUIT inválido' };
    docTipo = 80;
  } else if (docNro.length >= 7 && docNro.length <= 8) {
    docTipo = 96;
  } else return { error: 'DNI o CUIT inválido' };

  const condTok = resto.find(x => x.toLowerCase() in COND);
  const emisorAlias = resto.find(x => x && !(x.toLowerCase() in COND))?.toLowerCase();
  const condIva = condTok ? COND[condTok.toLowerCase()] : docTipo === 96 ? 5 : undefined;
  if (condIva === undefined) return { error: 'falta la condición IVA del cliente (RI, MONO, EXENTO o CF)' };

  return { monto, nombre, docTipo, docNro, condIva, emisorAlias };
}
```

### 7.3 Lógica del bot: `lib/bot.ts`

```ts
import * as db from './db-queries';
import { parsePedido } from './parse';
import { emitirPedido } from './emitir';
import { sendText } from './whatsapp';
import { linkComprobante } from './links';

const AYUDA = 'Para facturar escribí:\nfactura MONTO | NOMBRE | DNI o CUIT | TÉCNICO\nEj: factura 15000 | Juan Pérez | 30123456 | marcos';

export async function handleIncoming(m: any) {
  if (m.type !== 'text') return;
  const from: string = m.from;
  const text: string = m.text.body.trim();
  const low = text.toLowerCase();

  const usuario = await db.usuarioPorTelefono(from);
  if (!usuario) return;                      // números desconocidos: no responder

  if (low === 'si' || low === 'sí') return confirmar(from);
  if (low === 'no') { await db.cancelarPendientes(from); return sendText(from, 'Pedido cancelado.'); }
  if (low.startsWith('factura')) return nuevoPedido(from, m.id, text);
  return sendText(from, AYUDA);
}

async function nuevoPedido(from: string, waId: string, text: string) {
  const p = parsePedido(text);
  if ('error' in p) return sendText(from, `No pude leer el pedido: ${p.error}.\n\n${AYUDA}`);
  if (p.monto > Number(process.env.MONTO_MAXIMO)) return sendText(from, 'El monto supera el tope permitido.');

  const emisores = await db.emisoresDe(from);
  const emisor = p.emisorAlias
    ? emisores.find(e => e.alias === p.emisorAlias)
    : emisores.length === 1 ? emisores[0] : undefined;
  if (!emisor) return sendText(from, `Indicá el técnico: ${emisores.map(e => e.alias).join(', ')}`);

  await db.cancelarPendientes(from);
  const id = await db.crearPedido({ waId, from, emisor, p });   // INSERT ... ON CONFLICT (wa_message_id) DO NOTHING
  if (!id) return;                                               // mensaje duplicado

  await sendText(from,
    `Factura C\nEmite: ${emisor.razon_social} (${emisor.cuit})\n` +
    `Cliente: ${p.nombre} · ${p.docTipo === 80 ? 'CUIT' : 'DNI'} ${p.docNro}\n` +
    `Total: $${p.monto.toFixed(2)}\n\nRespondé SI para emitir o NO para cancelar.`);
}

async function confirmar(from: string) {
  const pedido = await db.pendienteDe(from);   // último PENDIENTE de los últimos 10 minutos
  if (!pedido) return sendText(from, 'No tenés ningún pedido pendiente.');

  const r = await emitirPedido(pedido.id);
  if (r.ok) {
    const nro = `${String(r.ptoVta).padStart(4, '0')}-${String(r.numero).padStart(8, '0')}`;
    return sendText(from, `Factura C ${nro} emitida.\nCAE: ${r.cae} · Vto: ${r.caeVto}\n${linkComprobante(pedido.id)}`);
  }
  if (r.estado === 'DUDOSA') {
    return sendText(from, 'ARCA no respondió y no sé si la factura se emitió. No la repitas: el administrador la va a verificar.');
  }
  return sendText(from, `ARCA rechazó la factura: ${r.error}`);
}
```

### 7.4 Emisión con bloqueo e idempotencia: `lib/emitir.ts`

Dos pedidos simultáneos del mismo técnico podrían pedir el mismo número. Por eso se toma un bloqueo por CUIT y punto de venta durante toda la emisión. Si la respuesta de ARCA es incierta (timeout o error de red), el pedido queda en `DUDOSA` y **no se reenvía automáticamente**.

```ts
import { pool } from './db';
import { ultimoNumero, crearFacturaC } from './arca';

export async function emitirPedido(id: string) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows: [p] } = await c.query(
      `SELECT p.*, e.cuit, e.pto_vta FROM pedidos p JOIN emisores e ON e.id = p.emisor_id
       WHERE p.id = $1 FOR UPDATE OF p`, [id]);
    if (!p || p.estado !== 'PENDIENTE') {
      await c.query('ROLLBACK');
      return { ok: false as const, estado: 'NO_DISPONIBLE', error: 'Pedido no disponible' };
    }
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${p.cuit}:${p.pto_vta}`]);

    try {
      const numero = (await ultimoNumero(p)) + 1;
      await c.query('UPDATE pedidos SET cbte_nro_intento = $2 WHERE id = $1', [id, numero]);
      const r = await crearFacturaC(p, numero);
      await c.query(
        `UPDATE pedidos SET estado='EMITIDA', cbte_nro=$2, cae=$3, cae_vto=$4, emitido=now() WHERE id=$1`,
        [id, r.numero, r.cae, r.caeVto]);
      await c.query('COMMIT');
      return { ok: true as const, ...r, ptoVta: p.pto_vta };
    } catch (e: any) {
      const dudosa = /timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed/i.test(String(e?.message ?? e));
      const estado = dudosa ? 'DUDOSA' : 'RECHAZADA';
      await c.query('UPDATE pedidos SET estado=$2, error=$3 WHERE id=$1', [id, estado, String(e?.message ?? e)]);
      await c.query('COMMIT');
      return { ok: false as const, estado, error: String(e?.message ?? e) };
    }
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
```

**Reconciliar un pedido `DUDOSA`:** consultar con `getLastVoucher` y `getVoucherInfo(numero, ptoVta, 11)` si el número `cbte_nro_intento` existe en ARCA y si coincide el importe y el documento del receptor. Si existe, se marca `EMITIDA` con su CAE. Si no existe, se marca `RECHAZADA` y se vuelve a pedir. Armar un script o un botón de admin para esto.

### 7.5 Llamadas a ARCA: `lib/arca.ts`

```ts
import Afip from '@afipsdk/afip.js';

export const FACTURA_C = 11;

function afipDe(cuit: number | string) {
  return new Afip({
    CUIT: Number(cuit),     // ver “Punto abierto n.º 1”: CUIT representado vs. CUIT del certificado
    cert: Buffer.from(process.env.ARCA_CERT_B64!, 'base64').toString('utf8'),
    key: Buffer.from(process.env.ARCA_KEY_B64!, 'base64').toString('utf8'),
    access_token: process.env.AFIPSDK_TOKEN!,
    production: process.env.ARCA_ENV === 'prod',
  });
}

// aaaammdd en horario de Argentina
function hoyAR() {
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  return Number(f.replace(/-/g, ''));
}

export async function ultimoNumero(p: { cuit: number; pto_vta: number }) {
  return afipDe(p.cuit).ElectronicBilling.getLastVoucher(p.pto_vta, FACTURA_C);
}

export async function crearFacturaC(p: any, nro: number) {
  const hoy = hoyAR();
  const total = Number(p.monto);
  const res = await afipDe(p.cuit).ElectronicBilling.createVoucher({
    CantReg: 1,
    PtoVta: p.pto_vta,
    CbteTipo: FACTURA_C,
    Concepto: p.concepto,                       // 1 productos, 2 servicios
    DocTipo: p.doc_tipo,                        // 80 CUIT, 96 DNI
    DocNro: Number(p.doc_nro),
    CbteDesde: nro,
    CbteHasta: nro,
    CbteFch: hoy,
    ...(p.concepto !== 1 && { FchServDesde: hoy, FchServHasta: hoy, FchVtoPago: hoy }),
    ImpTotal: total,
    ImpTotConc: 0,
    ImpNeto: total,                             // Factura C: no discrimina IVA
    ImpOpEx: 0,
    ImpIVA: 0,
    ImpTrib: 0,
    MonId: 'PES',
    MonCotiz: 1,
    CondicionIVAReceptorId: p.cond_iva_receptor,
  });
  return { numero: nro, cae: res.CAE as string, caeVto: res.CAEFchVto as string };
}
```

### 7.6 Envío por WhatsApp y QR

```ts
// lib/whatsapp.ts
export async function sendText(to: string, body: string) {
  const v = process.env.WA_GRAPH_VERSION;
  const r = await fetch(`https://graph.facebook.com/${v}/${process.env.WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
  if (!r.ok) console.error('WhatsApp error', r.status, await r.text());
}

// lib/qr.ts — QR oficial del comprobante
export function urlQr(f: { fecha: string; cuit: number; ptoVta: number; nro: number; importe: number;
                       docTipo: number; docNro: number; cae: string }) {
  const payload = {
    ver: 1, fecha: f.fecha, cuit: f.cuit, ptoVta: f.ptoVta, tipoCmp: 11, nroCmp: f.nro,
    importe: f.importe, moneda: 'PES', ctz: 1, tipoDocRec: f.docTipo, nroDocRec: f.docNro,
    tipoCodAut: 'E', codAut: Number(f.cae),
  };
  return 'https://www.afip.gob.ar/fe/qr/?p=' + Buffer.from(JSON.stringify(payload)).toString('base64');
}
```

Verificar contra el manual vigente de ARCA la URL base del QR y el formato exacto de los campos.

### 7.7 Comprobante imprimible

Para la v1, el bot responde con un link firmado (`/f/[id]?t=HMAC`) a una página HTML con estilos de impresión. Debe incluir los datos que exige una Factura C:

- Razón social, CUIT, domicilio, Ingresos Brutos y fecha de inicio de actividades del emisor.
- Leyenda “Factura C”, punto de venta y número, fecha.
- Datos del receptor (nombre, tipo y número de documento).
- Detalle y total.
- CAE, vencimiento del CAE y QR.

En la v2 se puede generar un PDF real (`@react-pdf/renderer`, o Puppeteer en un VPS) y enviarlo como documento adjunto subiéndolo antes como media a la API de WhatsApp.

## 8. Reglas fiscales de la Factura C que usa el bot

| Dato | Valor | Notas |
| --- | --- | --- |
| Tipo de comprobante | 11 (Factura C) | Nota de Crédito C = 13 (para la v2) |
| Concepto | 2 (servicios) por defecto | Con servicios hay que informar `FchServDesde`, `FchServHasta` y `FchVtoPago`. Para productos usar 1 |
| Tipo de documento | 80 CUIT, 96 DNI, 99 consumidor final | El bot siempre pide DNI o CUIT |
| Importes | `ImpNeto` = `ImpTotal`, `ImpIVA` = 0 | La C no discrimina IVA |
| Fecha | Hoy, con tolerancia de ±10 días en productos | Usar hora de Argentina |
| Condición IVA del receptor | Obligatoria (RG 5616/2024) | DNI → 5 consumidor final. CUIT → se indica en el mensaje. Validar la tabla con los parámetros de ARCA |
| Numeración | Último autorizado + 1, por punto de venta y tipo | Siempre bajo bloqueo |

Para la v2 conviene resolver la condición IVA de los clientes con CUIT consultando el padrón de ARCA, en lugar de pedirla en el mensaje.

## 9. Seguridad y control

- **Lista blanca de teléfonos:** solo los números cargados en `usuarios` pueden facturar, y cada uno solo por los técnicos asignados en `usuario_emisor`.
- **Firma del webhook** validada siempre. Sin firma válida no se procesa nada.
- **Confirmación con SI** y vencimiento del pedido pendiente a los 10 minutos.
- **Tope por factura** (`MONTO_MAXIMO`) y, si se quiere, tope diario por técnico.
- **Idempotencia:** `wa_message_id` único. Meta puede reentregar el mismo mensaje.
- **Secretos:** certificados y claves en variables de entorno o gestor de secretos. Nunca en el repositorio. No guardar claves fiscales de nadie.
- **Datos personales:** se guardan nombre y documento de clientes. Limitar el acceso a la base y definir cuánto tiempo se conservan.
- **Auditoría:** conservar todos los pedidos con su estado, error y CAE.
- **Teléfonos:** normalizar el formato. En Argentina el número puede llegar o requerir enviarse con o sin el “9” después del 54, así que probar con los números reales.

## 10. Despliegue

- **Dominio con HTTPS** para el webhook.
- **Vercel:** funciona si se define `maxDuration` suficiente y se usa Postgres externo (Neon, Supabase). No usar SQLite en archivo.
- **VPS o contenedor** (Railway, Fly, un servidor propio): más simple si querés procesos largos o PDF con Puppeteer.
- **Ventana de 24 horas de WhatsApp:** los mensajes libres solo se pueden enviar dentro de las 24 horas posteriores al último mensaje del usuario. Como siempre inicia el técnico, alcanza para este flujo. Avisos proactivos requieren plantillas aprobadas por Meta.
- **Monitoreo:** alertar cuando haya pedidos `DUDOSA` o errores de WSAA y vigilar el vencimiento de los certificados.

## 11. Plan de trabajo

| Fase | Contenido | Resultado esperado |
| --- | --- | --- |
| 0. Spike (½ día) | Factura C en homologación con el CUIT de prueba de Afip SDK. Probar la delegación con 2 CUIT reales de testing | Decidir Opción A o B |
| 1. Webhook | GET/POST, firma, eco de mensajes | Meta verifica y entrega mensajes |
| 2. Base y bot | Esquema, lista blanca, parser, confirmación | Flujo completo sin ARCA |
| 3. Emisión | `emitirPedido` contra homologación, bloqueo, estados | CAE de prueba por WhatsApp |
| 4. Comprobante | Página imprimible con QR | Comprobante válido para entregar |
| 5. Producción | Certificado productivo, un técnico piloto, luego el resto | Facturas reales |
| 6. v2 | Anulación con Nota de Crédito C, padrón de ARCA, PDF adjunto, reporte mensual por técnico, texto libre con IA | Operación completa |

**Pruebas de aceptación**

- [ ] Pedido válido con DNI emite y devuelve CAE en homologación.
- [ ] Pedido con CUIT sin condición IVA se rechaza con mensaje claro.
- [ ] Dos pedidos simultáneos del mismo técnico reciben números consecutivos.
- [ ] Reenviar el mismo mensaje de WhatsApp no duplica la factura.
- [ ] Un número no autorizado no recibe respuesta ni genera pedidos.
- [ ] Un técnico no puede facturar por otro.
- [ ] Un timeout de ARCA deja el pedido en `DUDOSA` y no se reenvía.
- [ ] El QR del comprobante abre la consulta de ARCA con los datos correctos.

## 12. Preguntas abiertas

1. **Delegación con Afip SDK** (punto abierto n.º 1): validar en homologación.
2. **Costos y límites** del plan de Afip SDK para producción y de WhatsApp Cloud API por conversación. No los verifiqué.
3. **Tope de monotributo:** ¿querés que el bot avise cuando un técnico se acerca al límite de su categoría? Requiere sumar lo facturado en 12 meses, incluidas facturas emitidas fuera del bot.
4. **Conceptos:** ¿todos los trabajos son servicios, o también venta de repuestos (concepto 3)?
5. **Descripción del servicio:** la factura puede necesitar un texto de detalle por trabajo. ¿Se agrega un campo al mensaje?

## 13. Fuentes

- Afip SDK, Factura C: docs.afipsdk.com/siguientes-pasos/web-services/factura-electronica/factura-c
- Afip SDK, Node.js y paso a producción: docs.afipsdk.com/integracion/node.js y docs.afipsdk.com/paso-a-paso/ir-a-produccion
- Afip SDK, uso por API (campo `tax_id`): docs.afipsdk.com/integracion/go
- Afip SDK, guías de delegación: docs.afipsdk.com/recursos/tutoriales-pagina-de-arca
- Modelo de delegación y punto de venta exclusivo: yo-facturo.com/blog/como-conectar-yofacturo-con-arca-certificado-digital-y-delegacion
- Condición IVA del receptor, vigencia desde 1/12/2026: vatupdate.com/2026/09/09/argentina-makes-recipient-vat-status-mandatory-in-electronic-invoices
- WhatsApp Cloud API, webhooks y firma: hookdeck.com/webhooks/platforms/guide-to-whatsapp-webhooks-features-and-best-practices
- Documentación oficial de Meta: developers.facebook.com/docs/whatsapp/cloud-api
