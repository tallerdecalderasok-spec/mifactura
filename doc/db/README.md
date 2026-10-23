# Módulo `db/`

La aplicación usa **Supabase PostgreSQL**. El backend Next.js accede a la base desde Node.js mediante `pg` y una `DATABASE_URL` privada del servidor; el navegador no recibe credenciales de base ni claves `service_role`.

## Archivos y operación

- [`schema.md`](./schema.md): entidades, restricciones y modelo de acceso.
- [`supabase/migrations/`](../../supabase/migrations/): migraciones con nombres/versiones generados por Supabase CLI.
- [`supabase/tests/`](../../supabase/tests/): pruebas pgTAP de seguridad.
- [`.env.example`](../../.env.example): variables ficticias; copiar la URI de conexión desde **Connect** en el Dashboard Supabase.

Comandos de desarrollo local:

```bash
npm run db:reset
npm run db:test
```

La base local requiere Supabase CLI y Docker. `db:reset` solo reinicia la instancia local; no usar opciones enlazadas o URLs remotas para esta tarea.

## Seguridad del Data API

Todas las tablas de `public` tienen RLS habilitado y no conceden acceso directo de tabla a `anon` ni `authenticated`. No existen políticas de cliente porque todavía no hay una superficie de consulta de usuario autorizada. La conexión `DATABASE_URL` opera exclusivamente en el servidor y tiene privilegios mayores que esos roles; no se debe exponer ni tratar RLS como sustituto de autorización de negocio.
