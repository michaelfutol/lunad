-- LUNAD M2 realtime ride core
-- Server-authoritative ride lifecycle, atomic offer acceptance, RLS and realtime publication.
-- Production fare/permit/dispatch policy remains separately configurable and must be verified before activation.

begin;

-- ---------------------------------------------------------------------------
-- SECURITY HELPERS
-- ---------------------------------------------------------------------------

create or replace function public.is_staff_for(
  p_organization_id uuid,
  p_municipality_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.profile_id = auth.uid()
      and m.organization_id = p_organization_id
      and m.is_active
      and m.role in ('DISPATCHER','COMPLIANCE_OFFICER','ADMIN','SUPERADMIN')
      and (m.municipality_id is null or p_municipality_id is null or m.municipality_id = p_municipality_id)
  );
$$;

create or replace function public.current_driver_id(
  p_organization_id uuid,
  p_municipality_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from public.drivers d
  where d.profile_id = auth.uid()
    and d.organization_id = p_organization_id
    and d.municipality_id = p_municipality_id
    and d.verification_status = 'APPROVED'
  limit 1;
$$;

create or replace function public.can_access_ride(p_ride_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ride_requests r
    left join public.drivers d on d.id = r.assigned_driver_id
    where r.id = p_ride_id
      and (
        r.passenger_id = auth.uid()
        or d.profile_id = auth.uid()
        or public.is_staff_for(r.organization_id, r.municipality_id)
      )
  );
$$;

create or replace function public.can_view_driver_presence(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.drivers d
    where d.id = p_driver_id
      and (
        d.profile_id = auth.uid()
        or public.is_staff_for(d.organization_id, d.municipality_id)
        or exists (
          select 1
          from public.ride_requests r
          where r.assigned_driver_id = d.id
            and r.passenger_id = auth.uid()
            and r.status in ('ASSIGNED','DRIVER_EN_ROUTE','DRIVER_ARRIVED','IN_TRIP')
        )
      )
  );
$$;

revoke all on function public.is_staff_for(uuid, uuid) from public;
revoke all on function public.current_driver_id(uuid, uuid) from public;
revoke all on function public.can_access_ride(uuid) from public;
revoke all on function public.can_view_driver_presence(uuid) from public;
grant execute on function public.is_staff_for(uuid, uuid) to authenticated;
grant execute on function public.current_driver_id(uuid, uuid) to authenticated;
grant execute on function public.can_access_ride(uuid) to authenticated;
grant execute on function public.can_view_driver_presence(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS POLICIES
-- Direct mutation of ride state is intentionally NOT granted; mutations use RPCs.
-- ---------------------------------------------------------------------------

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy organizations_authenticated_read on public.organizations
  for select to authenticated
  using (is_active);

create policy municipalities_authenticated_read on public.municipalities
  for select to authenticated
  using (is_active or is_laboratory);

create policy memberships_select_self on public.organization_memberships
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_staff_for(organization_id, municipality_id)
  );

create policy drivers_select_authorized on public.drivers
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_staff_for(organization_id, municipality_id)
    or exists (
      select 1
      from public.ride_requests r
      where r.assigned_driver_id = drivers.id
        and r.passenger_id = auth.uid()
        and r.status in ('ASSIGNED','DRIVER_EN_ROUTE','DRIVER_ARRIVED','IN_TRIP','COMPLETED')
    )
  );

create policy vehicles_select_authorized on public.vehicles
  for select to authenticated
  using (
    public.is_staff_for(organization_id, municipality_id)
    or exists (
      select 1
      from public.drivers d
      where d.active_vehicle_id = vehicles.id
        and d.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.ride_requests r
      where r.assigned_vehicle_id = vehicles.id
        and r.passenger_id = auth.uid()
        and r.status in ('ASSIGNED','DRIVER_EN_ROUTE','DRIVER_ARRIVED','IN_TRIP','COMPLETED')
    )
  );

create policy driver_presence_select_authorized on public.driver_presence
  for select to authenticated
  using (public.can_view_driver_presence(driver_id));

create policy ride_requests_select_authorized on public.ride_requests
  for select to authenticated
  using (public.can_access_ride(id));

create policy ride_offers_select_driver_or_staff on public.ride_offers
  for select to authenticated
  using (
    exists (
      select 1
      from public.drivers d
      where d.id = ride_offers.driver_id
        and d.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.ride_requests r
      where r.id = ride_offers.ride_request_id
        and public.is_staff_for(r.organization_id, r.municipality_id)
    )
  );

create policy ride_events_select_authorized on public.ride_events
  for select to authenticated
  using (public.can_access_ride(ride_request_id));

create policy ledger_select_own_or_staff on public.driver_ledger_entries
  for select to authenticated
  using (
    exists (
      select 1 from public.drivers d
      where d.id = driver_ledger_entries.driver_id
        and d.profile_id = auth.uid()
    )
    or public.is_staff_for(organization_id, municipality_id)
  );

create policy terminal_queue_select_driver_or_staff on public.terminal_queue_entries
  for select to authenticated
  using (
    exists (
      select 1 from public.drivers d
      where d.id = terminal_queue_entries.driver_id
        and d.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.terminals t
      where t.id = terminal_queue_entries.terminal_id
        and public.is_staff_for(t.organization_id, t.municipality_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RIDE CREATION
-- ---------------------------------------------------------------------------

create or replace function public.create_ride_request(
  p_organization_id uuid,
  p_municipality_id uuid,
  p_vehicle_class text,
  p_pickup_lng double precision,
  p_pickup_lat double precision,
  p_pickup_label text,
  p_dropoff_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_label text,
  p_road_distance_m integer default null,
  p_estimated_duration_s integer default null,
  p_is_test boolean default true
)
returns public.ride_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.ride_requests;
  v_fee integer;
  v_booking_code text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (select 1 from public.profiles p where p.id = auth.uid()) then
    raise exception 'PROFILE_REQUIRED';
  end if;

  if p_vehicle_class not in ('PADYAK','ETRIKE','TRICYCLE') then
    raise exception 'VEHICLE_CLASS_NOT_ENABLED';
  end if;

  if not exists (
    select 1 from public.organization_municipalities om
    join public.municipalities m on m.id = om.municipality_id
    where om.organization_id = p_organization_id
      and om.municipality_id = p_municipality_id
      and om.is_active
      and (m.is_active or m.is_laboratory)
  ) then
    raise exception 'MUNICIPALITY_NOT_ACTIVE';
  end if;

  select case when p_is_test then 0 else m.default_platform_fee_centavos end
    into v_fee
  from public.municipalities m
  where m.id = p_municipality_id;

  v_booking_code := 'LUN-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  insert into public.ride_requests (
    organization_id, municipality_id, passenger_id, booking_code,
    requested_vehicle_class, pickup, pickup_label, dropoff, dropoff_label,
    status, platform_fee_centavos, road_distance_m, estimated_duration_s, is_test
  ) values (
    p_organization_id, p_municipality_id, auth.uid(), v_booking_code,
    p_vehicle_class,
    ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat),4326)::geography,
    p_pickup_label,
    ST_SetSRID(ST_MakePoint(p_dropoff_lng, p_dropoff_lat),4326)::geography,
    p_dropoff_label,
    'SEARCHING', coalesce(v_fee, 0), p_road_distance_m, p_estimated_duration_s, p_is_test
  ) returning * into v_ride;

  insert into public.ride_events(ride_request_id,event_type,actor_role,actor_id,metadata)
  values (v_ride.id,'RIDE_REQUESTED','PASSENGER',auth.uid(),jsonb_build_object('is_test',p_is_test));

  return v_ride;
end;
$$;

grant execute on function public.create_ride_request(uuid,uuid,text,double precision,double precision,text,double precision,double precision,text,integer,integer,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- LAB / DISPATCHER OFFER CREATION
-- Deliberately staff-only. Automated DispatchEngine will call an equivalent
-- server-authoritative path later.
-- ---------------------------------------------------------------------------

create or replace function public.dispatch_offer_to_driver(
  p_ride_id uuid,
  p_driver_id uuid,
  p_vehicle_id uuid,
  p_expires_seconds integer default 25,
  p_reason text default 'MANUAL_OR_LAB_DISPATCH'
)
returns public.ride_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.ride_requests;
  v_offer public.ride_offers;
begin
  select * into v_ride from public.ride_requests where id = p_ride_id for update;
  if not found then raise exception 'RIDE_NOT_FOUND'; end if;
  if not public.is_staff_for(v_ride.organization_id, v_ride.municipality_id) then
    raise exception 'STAFF_REQUIRED';
  end if;
  if v_ride.status not in ('SEARCHING','OFFERED') then raise exception 'RIDE_NOT_OFFERABLE'; end if;
  if p_expires_seconds < 5 or p_expires_seconds > 120 then raise exception 'INVALID_EXPIRY'; end if;

  if not exists (
    select 1 from public.drivers d
    join public.driver_vehicle_assignments a on a.driver_id = d.id and a.vehicle_id = p_vehicle_id and a.is_active and a.ends_at is null
    join public.vehicles v on v.id = p_vehicle_id
    where d.id = p_driver_id
      and d.organization_id = v_ride.organization_id
      and d.municipality_id = v_ride.municipality_id
      and d.verification_status = 'APPROVED'
      and d.operational_status in ('AVAILABLE','PILA','OFFERED')
      and v.verification_status = 'APPROVED'
      and v.is_active
      and upper(v.vehicle_class) = upper(v_ride.requested_vehicle_class)
  ) then
    raise exception 'DRIVER_NOT_ELIGIBLE';
  end if;

  insert into public.ride_offers(ride_request_id,driver_id,vehicle_id,expires_at,status,dispatch_reason)
  values (p_ride_id,p_driver_id,p_vehicle_id,now() + make_interval(secs => p_expires_seconds),'OFFERED',p_reason)
  returning * into v_offer;

  update public.ride_requests set status='OFFERED' where id=p_ride_id;
  update public.drivers set operational_status='OFFERED', updated_at=now() where id=p_driver_id;
  insert into public.ride_events(ride_request_id,event_type,actor_role,actor_id,metadata)
  values (p_ride_id,'DRIVER_OFFERED','DISPATCHER',auth.uid(),jsonb_build_object('driver_id',p_driver_id,'offer_id',v_offer.id,'reason',p_reason));

  return v_offer;
end;
$$;

grant execute on function public.dispatch_offer_to_driver(uuid,uuid,uuid,integer,text) to authenticated;

-- ---------------------------------------------------------------------------
-- ATOMIC OFFER ACCEPTANCE
-- The ride row lock serializes competing accepts. The partial unique index in
-- 0001 is a second independent invariant: max one ACCEPTED offer per ride.
-- ---------------------------------------------------------------------------

create or replace function public.accept_ride_offer(p_offer_id uuid)
returns public.ride_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.ride_offers;
  v_ride public.ride_requests;
  v_driver_profile uuid;
begin
  select o.* into v_offer from public.ride_offers o where o.id = p_offer_id;
  if not found then raise exception 'OFFER_NOT_FOUND'; end if;

  select * into v_ride from public.ride_requests where id = v_offer.ride_request_id for update;
  if not found then raise exception 'RIDE_NOT_FOUND'; end if;

  select d.profile_id into v_driver_profile from public.drivers d where d.id = v_offer.driver_id;
  if v_driver_profile is distinct from auth.uid() then raise exception 'OFFER_NOT_OWNED'; end if;

  -- Refresh the offer after acquiring the ride lock.
  select o.* into v_offer from public.ride_offers o where o.id = p_offer_id for update;
  if v_offer.status <> 'OFFERED' then raise exception 'OFFER_NOT_AVAILABLE'; end if;
  if v_offer.expires_at <= now() then
    update public.ride_offers set status='EXPIRED', responded_at=now() where id=p_offer_id;
    raise exception 'OFFER_EXPIRED';
  end if;
  if v_ride.status not in ('SEARCHING','OFFERED') or v_ride.assigned_driver_id is not null then
    raise exception 'RIDE_ALREADY_ASSIGNED';
  end if;
  if exists (
    select 1 from public.ride_requests r
    where r.assigned_driver_id = v_offer.driver_id
      and r.id <> v_ride.id
      and r.status in ('ASSIGNED','DRIVER_EN_ROUTE','DRIVER_ARRIVED','IN_TRIP')
  ) then
    raise exception 'DRIVER_BUSY';
  end if;

  update public.ride_offers
    set status='ACCEPTED', responded_at=now()
    where id=p_offer_id and status='OFFERED';

  update public.ride_offers
    set status='WITHDRAWN', responded_at=coalesce(responded_at,now())
    where ride_request_id=v_ride.id and id<>p_offer_id and status='OFFERED';

  update public.ride_requests
    set status='ASSIGNED', assigned_driver_id=v_offer.driver_id, assigned_vehicle_id=v_offer.vehicle_id,
        assigned_at=now(), dispatch_reason_code=coalesce(v_offer.dispatch_reason,'DRIVER_ACCEPTED')
    where id=v_ride.id
    returning * into v_ride;

  update public.drivers
    set operational_status='ASSIGNED', active_vehicle_id=v_offer.vehicle_id, updated_at=now()
    where id=v_offer.driver_id;

  insert into public.ride_events(ride_request_id,event_type,actor_role,actor_id,metadata)
  values (v_ride.id,'DRIVER_ASSIGNED','DRIVER',auth.uid(),jsonb_build_object('driver_id',v_offer.driver_id,'vehicle_id',v_offer.vehicle_id,'offer_id',p_offer_id));

  return v_ride;
end;
$$;

grant execute on function public.accept_ride_offer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- DRIVER RIDE STATE TRANSITIONS + IDEMPOTENT PLATFORM FEE
-- ---------------------------------------------------------------------------

create or replace function public.driver_transition_ride(
  p_ride_id uuid,
  p_target public.ride_status
)
returns public.ride_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.ride_requests;
  v_driver public.drivers;
  v_event text;
begin
  select * into v_ride from public.ride_requests where id=p_ride_id for update;
  if not found then raise exception 'RIDE_NOT_FOUND'; end if;

  select * into v_driver from public.drivers where id=v_ride.assigned_driver_id;
  if not found or v_driver.profile_id is distinct from auth.uid() then raise exception 'ASSIGNED_DRIVER_REQUIRED'; end if;

  if p_target='DRIVER_EN_ROUTE' and v_ride.status='ASSIGNED' then
    update public.ride_requests set status=p_target,en_route_at=now() where id=p_ride_id returning * into v_ride;
    update public.drivers set operational_status='EN_ROUTE',updated_at=now() where id=v_driver.id;
    v_event := 'DRIVER_EN_ROUTE';
  elsif p_target='DRIVER_ARRIVED' and v_ride.status='DRIVER_EN_ROUTE' then
    update public.ride_requests set status=p_target,arrived_at=now() where id=p_ride_id returning * into v_ride;
    update public.drivers set operational_status='ARRIVED',updated_at=now() where id=v_driver.id;
    v_event := 'DRIVER_ARRIVED';
  elsif p_target='IN_TRIP' and v_ride.status='DRIVER_ARRIVED' then
    update public.ride_requests set status=p_target,started_at=now() where id=p_ride_id returning * into v_ride;
    update public.drivers set operational_status='ON_TRIP',updated_at=now() where id=v_driver.id;
    v_event := 'TRIP_STARTED';
  elsif p_target='COMPLETED' and v_ride.status='IN_TRIP' then
    update public.ride_requests set status=p_target,completed_at=now() where id=p_ride_id returning * into v_ride;
    update public.drivers set operational_status='AVAILABLE',completed_rides_count=completed_rides_count+1,updated_at=now() where id=v_driver.id;
    v_event := 'TRIP_COMPLETED';

    if not v_ride.is_test and v_ride.platform_fee_centavos > 0 then
      insert into public.driver_ledger_entries(
        organization_id,municipality_id,driver_id,ride_request_id,transaction_type,
        amount_centavos,idempotency_key,actor_id,reason,reference_code
      ) values (
        v_ride.organization_id,v_ride.municipality_id,v_driver.id,v_ride.id,'PLATFORM_FEE',
        -v_ride.platform_fee_centavos,'platform_fee:'||v_ride.id::text,auth.uid(),
        'Platform fee for successfully completed app-generated ride',v_ride.booking_code
      ) on conflict do nothing;
    end if;
  else
    raise exception 'ILLEGAL_RIDE_TRANSITION % -> %', v_ride.status, p_target;
  end if;

  insert into public.ride_events(ride_request_id,event_type,actor_role,actor_id,metadata)
  values (p_ride_id,v_event,'DRIVER',auth.uid(),jsonb_build_object('from_status',v_ride.status,'target_status',p_target));

  return v_ride;
end;
$$;

grant execute on function public.driver_transition_ride(uuid,public.ride_status) to authenticated;

-- ---------------------------------------------------------------------------
-- DRIVER PRESENCE UPDATE
-- ---------------------------------------------------------------------------

create or replace function public.update_driver_presence(
  p_driver_id uuid,
  p_status public.driver_operational_status,
  p_lng double precision default null,
  p_lat double precision default null,
  p_accuracy_m numeric default null,
  p_heading numeric default null,
  p_speed_mps numeric default null
)
returns public.driver_presence
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver public.drivers;
  v_presence public.driver_presence;
begin
  select * into v_driver from public.drivers where id=p_driver_id;
  if not found or v_driver.profile_id is distinct from auth.uid() then raise exception 'DRIVER_REQUIRED'; end if;
  if v_driver.verification_status <> 'APPROVED' then raise exception 'DRIVER_NOT_APPROVED'; end if;

  insert into public.driver_presence(driver_id,status,location,accuracy_m,heading,speed_mps,recorded_at)
  values (
    p_driver_id,p_status,
    case when p_lng is null or p_lat is null then null else ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography end,
    p_accuracy_m,p_heading,p_speed_mps,now()
  )
  on conflict(driver_id) do update set
    status=excluded.status,
    location=excluded.location,
    accuracy_m=excluded.accuracy_m,
    heading=excluded.heading,
    speed_mps=excluded.speed_mps,
    recorded_at=excluded.recorded_at
  returning * into v_presence;

  update public.drivers set operational_status=p_status,updated_at=now() where id=p_driver_id;
  return v_presence;
end;
$$;

grant execute on function public.update_driver_presence(uuid,public.driver_operational_status,double precision,double precision,numeric,numeric,numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- REALTIME PUBLICATION
-- ---------------------------------------------------------------------------

alter table public.ride_requests replica identity full;
alter table public.ride_offers replica identity full;
alter table public.ride_events replica identity full;
alter table public.driver_presence replica identity full;
alter table public.drivers replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ride_requests') then
      execute 'alter publication supabase_realtime add table public.ride_requests';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ride_offers') then
      execute 'alter publication supabase_realtime add table public.ride_offers';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ride_events') then
      execute 'alter publication supabase_realtime add table public.ride_events';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='driver_presence') then
      execute 'alter publication supabase_realtime add table public.driver_presence';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='drivers') then
      execute 'alter publication supabase_realtime add table public.drivers';
    end if;
  end if;
end $$;

commit;
