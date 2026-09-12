-- LUNAD Mobility canonical core schema
-- Phase: Sta. Magdalena laboratory / pre-alpha
-- Production policy data (fares, permits, terminals, zones) must be field-verified before activation.

begin;

create extension if not exists pgcrypto;
create extension if not exists postgis;

create type public.user_role as enum (
  'PASSENGER','DRIVER','OPERATOR','DISPATCHER','COMPLIANCE_OFFICER','ADMIN','SUPERADMIN'
);
create type public.verification_status as enum (
  'PENDING','REVIEWING','APPROVED','REQUEST_UPDATE','REJECTED','SUSPENDED','EXPIRED','REVOKED'
);
create type public.driver_operational_status as enum (
  'OFFLINE','AVAILABLE','PILA','OFFERED','ASSIGNED','EN_ROUTE','ARRIVED','ON_TRIP','PAUSED'
);
create type public.ride_status as enum (
  'REQUESTED','SEARCHING','OFFERED','ASSIGNED','DRIVER_EN_ROUTE','DRIVER_ARRIVED','IN_TRIP','COMPLETED','CANCELLED','EXPIRED','NO_DRIVER'
);
create type public.dispatch_strategy as enum (
  'HYBRID','NEAREST','TERMINAL_QUEUE','ROUND_ROBIN','MANUAL'
);
create type public.queue_entry_status as enum (
  'WAITING','OFFERED','ASSIGNED','PAUSED','LEFT','EXPIRED'
);
create type public.ledger_transaction_type as enum (
  'PLATFORM_FEE','CREDIT','CASH_PAYMENT','GCASH_PAYMENT','ADMIN_ADJUSTMENT','REVERSAL','PROMOTIONAL_CREDIT','OTHER'
);
create type public.policy_verification_status as enum ('UNVERIFIED','VERIFIED','RETIRED');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.municipalities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  province text not null,
  country_code text not null default 'PH',
  timezone text not null default 'Asia/Manila',
  currency_code text not null default 'PHP',
  is_laboratory boolean not null default false,
  is_active boolean not null default false,
  center geography(point,4326),
  default_platform_fee_centavos integer not null default 100 check (default_platform_fee_centavos >= 0),
  default_dispatch_strategy public.dispatch_strategy not null default 'HYBRID',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_municipalities (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  is_active boolean not null default true,
  primary key (organization_id, municipality_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  preferred_name text,
  phone text,
  avatar_path text,
  emergency_contact jsonb,
  is_test_user boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid references public.municipalities(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, municipality_id, profile_id, role)
);

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  business_name text,
  contact_number text,
  verification_status public.verification_status not null default 'PENDING',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transport_associations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  code text,
  name text not null,
  contact_person text,
  contact_phone text,
  verification_status public.policy_verification_status not null default 'UNVERIFIED',
  source_reference text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  operator_id uuid references public.operators(id) on delete set null,
  association_id uuid references public.transport_associations(id) on delete set null,
  driver_code text not null,
  verification_status public.verification_status not null default 'PENDING',
  operational_status public.driver_operational_status not null default 'OFFLINE',
  active_vehicle_id uuid,
  current_terminal_id uuid,
  rating_average numeric(3,2) not null default 0 check (rating_average >= 0 and rating_average <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  completed_rides_count integer not null default 0 check (completed_rides_count >= 0),
  suspended_at timestamptz,
  suspension_reason text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, driver_code)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  operator_id uuid references public.operators(id) on delete set null,
  vehicle_class text not null,
  public_vehicle_code text not null,
  plate_or_local_identifier text,
  make_model text,
  color text,
  passenger_capacity integer check (passenger_capacity is null or passenger_capacity >= 0),
  cargo_capacity_kg numeric(10,2),
  verification_status public.verification_status not null default 'PENDING',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, public_vehicle_code)
);

alter table public.drivers
  add constraint drivers_active_vehicle_fk
  foreign key (active_vehicle_id) references public.vehicles(id) on delete set null;

create table public.driver_vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index driver_one_active_assignment_idx
  on public.driver_vehicle_assignments(driver_id)
  where is_active and ends_at is null;

create table public.permit_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  code text not null,
  name text not null,
  issuing_authority text,
  applicable_vehicle_classes text[] not null default '{}',
  applicable_service_types text[] not null default array['RIDE']::text[],
  subject_scope text not null default 'VEHICLE' check (subject_scope in ('DRIVER','VEHICLE','OPERATOR','ASSOCIATION')),
  is_required boolean not null default false,
  grace_period_days integer not null default 0 check (grace_period_days >= 0),
  policy_status public.policy_verification_status not null default 'UNVERIFIED',
  source_reference text,
  effective_from date,
  effective_until date,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, municipality_id, code)
);

create table public.permits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  permit_type_id uuid not null references public.permit_types(id) on delete restrict,
  driver_id uuid references public.drivers(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  operator_id uuid references public.operators(id) on delete cascade,
  permit_number text,
  issuing_authority text,
  issue_date date,
  expiry_date date,
  document_path text,
  verification_status public.verification_status not null default 'PENDING',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  check (driver_id is not null or vehicle_id is not null or operator_id is not null)
);

create table public.terminals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  association_id uuid references public.transport_associations(id) on delete set null,
  code text not null,
  name text not null,
  location geography(point,4326) not null,
  geofence_radius_m integer not null default 100 check (geofence_radius_m > 0),
  allowed_vehicle_classes text[] not null default '{}',
  dispatch_policy public.dispatch_strategy not null default 'HYBRID',
  operating_hours jsonb,
  verification_status public.policy_verification_status not null default 'UNVERIFIED',
  source_reference text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, municipality_id, code)
);

alter table public.drivers
  add constraint drivers_current_terminal_fk
  foreign key (current_terminal_id) references public.terminals(id) on delete set null;

create table public.service_zones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  code text not null,
  name text not null,
  area geography(multipolygon,4326) not null,
  allowed_vehicle_classes text[] not null default '{}',
  pickup_allowed boolean not null default true,
  dropoff_allowed boolean not null default true,
  rules jsonb not null default '{}'::jsonb,
  verification_status public.policy_verification_status not null default 'UNVERIFIED',
  source_reference text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, municipality_id, code)
);

create table public.fare_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  service_zone_id uuid references public.service_zones(id) on delete set null,
  vehicle_class text not null,
  rule_type text not null check (rule_type in ('FIXED','ZONE','DISTANCE','MATRIX','MANUAL_APPROVED')),
  base_fare_centavos integer check (base_fare_centavos is null or base_fare_centavos >= 0),
  included_distance_m integer check (included_distance_m is null or included_distance_m >= 0),
  increment_distance_m integer check (increment_distance_m is null or increment_distance_m > 0),
  increment_fare_centavos integer check (increment_fare_centavos is null or increment_fare_centavos >= 0),
  fixed_zone_fare_centavos integer check (fixed_zone_fare_centavos is null or fixed_zone_fare_centavos >= 0),
  minimum_fare_centavos integer check (minimum_fare_centavos is null or minimum_fare_centavos >= 0),
  maximum_fare_centavos integer check (maximum_fare_centavos is null or maximum_fare_centavos >= 0),
  platform_fee_centavos integer not null default 100 check (platform_fee_centavos >= 0),
  authority_reference text,
  policy_status public.policy_verification_status not null default 'UNVERIFIED',
  is_demo boolean not null default true,
  effective_from timestamptz,
  effective_until timestamptz,
  rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  name text not null,
  normalized_name text,
  aliases text[] not null default '{}',
  category text,
  location geography(point,4326) not null,
  address_text text,
  barangay text,
  landmark_notes text,
  verification_status public.policy_verification_status not null default 'UNVERIFIED',
  source text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index places_location_gix on public.places using gist(location);

create table public.driver_presence (
  driver_id uuid primary key references public.drivers(id) on delete cascade,
  status public.driver_operational_status not null default 'OFFLINE',
  location geography(point,4326),
  accuracy_m numeric(10,2),
  heading numeric(6,2),
  speed_mps numeric(8,2),
  recorded_at timestamptz not null default now()
);
create index driver_presence_location_gix on public.driver_presence using gist(location);

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  passenger_id uuid not null references public.profiles(id) on delete restrict,
  booking_code text not null unique,
  requested_vehicle_class text not null,
  pickup geography(point,4326) not null,
  pickup_label text,
  pickup_notes text,
  dropoff geography(point,4326) not null,
  dropoff_label text,
  dropoff_notes text,
  status public.ride_status not null default 'REQUESTED',
  fare_rule_id uuid references public.fare_rules(id) on delete restrict,
  passenger_fare_centavos integer check (passenger_fare_centavos is null or passenger_fare_centavos >= 0),
  platform_fee_centavos integer not null default 100 check (platform_fee_centavos >= 0),
  road_distance_m integer check (road_distance_m is null or road_distance_m >= 0),
  straight_line_distance_m integer check (straight_line_distance_m is null or straight_line_distance_m >= 0),
  estimated_duration_s integer check (estimated_duration_s is null or estimated_duration_s >= 0),
  assigned_driver_id uuid references public.drivers(id) on delete set null,
  assigned_vehicle_id uuid references public.vehicles(id) on delete set null,
  dispatch_strategy_used public.dispatch_strategy,
  dispatch_reason_code text,
  terminal_id_used uuid references public.terminals(id) on delete set null,
  is_test boolean not null default false,
  share_token_hash text,
  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
);
create index ride_requests_status_idx on public.ride_requests(organization_id, municipality_id, status, created_at desc);
create index ride_requests_pickup_gix on public.ride_requests using gist(pickup);

create table public.ride_offers (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  status text not null default 'OFFERED' check (status in ('OFFERED','ACCEPTED','REJECTED','EXPIRED','WITHDRAWN')),
  dispatch_score numeric,
  dispatch_reason text
);
create unique index one_accepted_offer_per_ride_idx
  on public.ride_offers(ride_request_id)
  where status = 'ACCEPTED';

create table public.terminal_queue_entries (
  id uuid primary key default gen_random_uuid(),
  terminal_id uuid not null references public.terminals(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  vehicle_class text not null,
  joined_at timestamptz not null default now(),
  queue_position integer not null check (queue_position > 0),
  status public.queue_entry_status not null default 'WAITING',
  dispatched_ride_id uuid references public.ride_requests(id) on delete set null,
  left_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index driver_one_waiting_queue_idx
  on public.terminal_queue_entries(driver_id)
  where status = 'WAITING';

create table public.ride_events (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  event_type text not null,
  actor_role text not null,
  actor_id uuid,
  location geography(point,4326),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index ride_events_ride_idx on public.ride_events(ride_request_id, occurred_at);

create table public.driver_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  ride_request_id uuid references public.ride_requests(id) on delete restrict,
  transaction_type public.ledger_transaction_type not null,
  amount_centavos integer not null,
  idempotency_key text not null unique,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  reference_code text,
  reverses_entry_id uuid references public.driver_ledger_entries(id) on delete restrict,
  created_at timestamptz not null default now()
);
create unique index one_platform_fee_per_ride_idx
  on public.driver_ledger_entries(ride_request_id)
  where transaction_type = 'PLATFORM_FEE';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  ride_request_id uuid references public.ride_requests(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  method text not null,
  amount_centavos integer not null check (amount_centavos >= 0),
  status text not null default 'RECORDED',
  external_reference text,
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now()
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  feedback_text text,
  created_at timestamptz not null default now(),
  unique (ride_request_id, passenger_id)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  ride_request_id uuid references public.ride_requests(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_role text,
  category text not null,
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','REVIEWING','ESCALATED','RESOLVED')),
  description text not null,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid references public.municipalities(id) on delete cascade,
  flag_key text not null,
  enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (organization_id, municipality_id, flag_key)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  municipality_id uuid references public.municipalities(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes supporting common operating views.
create index drivers_ops_idx on public.drivers(organization_id, municipality_id, operational_status, verification_status);
create index permits_expiry_idx on public.permits(organization_id, municipality_id, expiry_date, verification_status);
create index queue_terminal_idx on public.terminal_queue_entries(terminal_id, status, queue_position);
create index ledger_driver_idx on public.driver_ledger_entries(driver_id, created_at desc);
create index incidents_status_idx on public.incidents(organization_id, municipality_id, status, created_at desc);

-- RLS is enabled now; policies are intentionally added in a dedicated migration after role helpers are defined.
alter table public.organizations enable row level security;
alter table public.municipalities enable row level security;
alter table public.organization_municipalities enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.operators enable row level security;
alter table public.transport_associations enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_vehicle_assignments enable row level security;
alter table public.permit_types enable row level security;
alter table public.permits enable row level security;
alter table public.terminals enable row level security;
alter table public.service_zones enable row level security;
alter table public.fare_rules enable row level security;
alter table public.places enable row level security;
alter table public.driver_presence enable row level security;
alter table public.ride_requests enable row level security;
alter table public.ride_offers enable row level security;
alter table public.terminal_queue_entries enable row level security;
alter table public.ride_events enable row level security;
alter table public.driver_ledger_entries enable row level security;
alter table public.payments enable row level security;
alter table public.ratings enable row level security;
alter table public.incidents enable row level security;
alter table public.feature_flags enable row level security;
alter table public.audit_logs enable row level security;

commit;
