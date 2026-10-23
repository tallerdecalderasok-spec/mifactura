CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 varchar(16) NOT NULL UNIQUE
    CHECK (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  display_name text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL,
  cuit varchar(11) NOT NULL CHECK (cuit ~ '^[0-9]{11}$'),
  legal_name text NOT NULL,
  point_of_sale integer NOT NULL CHECK (point_of_sale BETWEEN 1 AND 99999),
  is_active boolean NOT NULL DEFAULT false,
  arca_authorization_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT is_active OR arca_authorization_verified_at IS NOT NULL)
);

CREATE UNIQUE INDEX issuers_alias_unique ON public.issuers (lower(alias));
CREATE UNIQUE INDEX issuers_cuit_point_of_sale_unique
  ON public.issuers (cuit, point_of_sale);

CREATE TABLE public.user_issuers (
  user_id uuid NOT NULL REFERENCES public.users(id),
  issuer_id uuid NOT NULL REFERENCES public.issuers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, issuer_id)
);

CREATE TABLE public.inbound_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN ('message', 'status')),
  payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  processed_at timestamptz,
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inbound_events_claim_idx
  ON public.inbound_events (available_at, received_at)
  WHERE processing_status IN ('pending', 'failed');

CREATE TABLE public.invoice_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_message_id text NOT NULL UNIQUE REFERENCES public.inbound_events(event_id),
  user_id uuid NOT NULL REFERENCES public.users(id),
  issuer_id uuid NOT NULL REFERENCES public.issuers(id),
  receiver_name text NOT NULL,
  receiver_tax_id text NOT NULL,
  receiver_vat_condition text NOT NULL,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  concept text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'issued', 'rejected', 'uncertain')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invoice_requests_user_pending_idx
  ON public.invoice_requests (user_id, expires_at)
  WHERE status = 'pending';

CREATE TABLE public.issuance_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_request_id uuid NOT NULL REFERENCES public.invoice_requests(id),
  idempotency_key text NOT NULL UNIQUE,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  status text NOT NULL
    CHECK (status IN ('pending', 'authorized', 'rejected', 'uncertain')),
  request_snapshot jsonb NOT NULL,
  response_snapshot jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (invoice_request_id, attempt_number)
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_request_id uuid NOT NULL UNIQUE REFERENCES public.invoice_requests(id),
  issuer_id uuid NOT NULL REFERENCES public.issuers(id),
  point_of_sale integer NOT NULL CHECK (point_of_sale BETWEEN 1 AND 99999),
  invoice_type integer NOT NULL CHECK (invoice_type > 0),
  invoice_number integer NOT NULL CHECK (invoice_number > 0),
  cae varchar(14) NOT NULL CHECK (cae ~ '^[0-9]{14}$'),
  cae_expires_on date NOT NULL,
  issued_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer_id, point_of_sale, invoice_type, invoice_number)
);

CREATE TABLE public.outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id text REFERENCES public.inbound_events(event_id),
  recipient_phone text NOT NULL,
  message_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'delivery_unknown', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  meta_message_id text UNIQUE,
  available_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbound_messages_claim_idx
  ON public.outbound_messages (available_at, created_at)
  WHERE status IN ('pending', 'failed');

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issuance_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.users,
  public.issuers,
  public.user_issuers,
  public.inbound_events,
  public.invoice_requests,
  public.issuance_attempts,
  public.invoices,
  public.outbound_messages,
  public.audit_events
FROM PUBLIC, anon, authenticated;