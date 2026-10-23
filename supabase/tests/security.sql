BEGIN;

SELECT plan(2);

SELECT ok(
  (
    SELECT count(*) = 9
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'users',
        'issuers',
        'user_issuers',
        'inbound_events',
        'invoice_requests',
        'issuance_attempts',
        'invoices',
        'outbound_messages',
        'audit_events'
      )
      AND rowsecurity
  ),
  'RLS is enabled for every application table'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'public.users',
      'public.issuers',
      'public.user_issuers',
      'public.inbound_events',
      'public.invoice_requests',
      'public.issuance_attempts',
      'public.invoices',
      'public.outbound_messages',
      'public.audit_events'
    ]) AS tables(table_name)
    CROSS JOIN (VALUES ('anon'), ('authenticated')) AS roles(role_name)
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS privileges(privilege)
    WHERE has_table_privilege(roles.role_name, tables.table_name, privileges.privilege)
  ),
  'anon and authenticated have no direct table privileges'
);

SELECT * FROM finish();

ROLLBACK;
