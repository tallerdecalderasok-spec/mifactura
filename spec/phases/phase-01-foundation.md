# Fase 1 — Fundación, persistencia y acceso

**Estado:** en curso. La administración/onboarding sigue bloqueada por D-06 de la [Fase 0](./phase-00-discovery.md).  
**Tareas:** T04–T06 del [roadmap](../implementation-plan.md).  
**Reglas comunes:** [especificación general](../project-spec.md).

## Objetivo

Preparar la aplicación servidor, configuración segura, modelo Supabase PostgreSQL con restricciones y autorización de usuarios/emisores.

## T04 — Inicializar aplicación y configuración segura

### Alcance

- Crear Next.js App Router/TypeScript según decisiones de Fase 0.
- Configurar comandos de typecheck, lint, pruebas y build.
- Validar configuración del servidor y documentar variables en `.env.example` sin secretos.
- Definir runtime Node donde aplique, health check seguro y bloqueos para ambiente productivo en pruebas.

### Criterios de aceptación

- Build, typecheck y lint pasan.
- Configuración faltante causa error explícito sin revelar valores.
- Tests no pueden seleccionar producción por defecto.
- No hay credenciales reales en archivos, logs o respuestas.

## T05 — Modelo PostgreSQL y repositorios

### Alcance

- Implementar migraciones Supabase para usuarios, emisores, permisos, inbox, pedidos, intentos, comprobantes, outbox y auditoría.
- Mantener RLS habilitado en todas las tablas del esquema expuesto y revocar acceso directo de `anon`/`authenticated` hasta que exista un modelo de autorización aprobado.
- Definir restricciones únicas, estados y reclamación de trabajo.
- Usar `NUMERIC/DECIMAL` para importes y texto para DNI/CUIT.
- Implementar repositorios parametrizados y transacciones acotadas.

### Criterios de aceptación

- Migraciones Supabase se aplican en una base local vacía y siguen el proceso repetible elegido.
- Constraints impiden IDs de evento duplicados y números de comprobante repetidos por emisor/punto/tipo.
- Pruebas de repositorios cubren integridad y acceso.
- No se mantiene una transacción larga abierta mientras se espera una llamada remota por defecto.

## T06 — Administración y onboarding

**Precondición:** mecanismo administrativo aprobado en T01.

### Alcance

- Activar/desactivar solicitantes y emisores.
- Crear asociación permitida entre usuario y emisor.
- Registrar CUIT, razón social, punto de venta y datos fiscales mínimos.
- Mantener estado/evidencia de autorización ARCA sin almacenar claves privadas inseguras.
- Auditar cambios de acceso.

### Criterios de aceptación

- Solo el rol/mecanismo administrativo aprobado puede cambiar autorizaciones.
- Usuario o emisor inactivo no puede crear una solicitud facturable.
- Un usuario no puede seleccionar un emisor no asignado.
- No se habilita emisión sin punto de venta y autorización verificados.

## Salida de fase

Aplicación y persistencia verificables en entorno de desarrollo; identidades y permisos quedan sometidos a pruebas.

## No incluye

Mensajes reales, emisión desde interacción de usuario ni activación de emisores sin homologación.

## Estado de implementación

- T04: scaffold Next.js/TypeScript, validación de entorno, health check y configuración ficticia; build, lint, typecheck y pruebas unitarias pasan.
- T05: esquema inicial en `supabase/migrations/`, conexión PostgreSQL server-side y pruebas SQL de RLS creadas. La migración se aplicó y verificó con PostgreSQL embebido (9 tablas con RLS, cero privilegios directos para `anon`/`authenticated`, deduplicación del inbox); la prueba pgTAP en Supabase CLI local sigue pendiente porque falta Docker/Podman.
- T06: no iniciado. Bloqueado hasta aprobar el mecanismo administrativo de D-06; no se exponen operaciones de alta o autorización.
