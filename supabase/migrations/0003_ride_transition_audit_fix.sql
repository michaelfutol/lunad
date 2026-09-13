-- Preserve the true pre-transition status in ride event metadata.

begin;

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
  v_from_status public.ride_status;
begin
  select * into v_ride from public.ride_requests where id=p_ride_id for update;
  if not found then raise exception 'RIDE_NOT_FOUND'; end if;
  v_from_status := v_ride.status;

  select * into v_driver from public.drivers where id=v_ride.assigned_driver_id;
  if not found or v_driver.profile_id is distinct from auth.uid() then raise exception 'ASSIGNED_DRIVER_REQUIRED'; end if;

  if p_target='DRIVER_EN_ROUTE' and v_from_status='ASSIGNED' then
    update public.ride_requests set status=p_target,en_route_at=now() where id=p_ride_id returning * into v_ride;
    update public.drivers set operational_status='EN_ROUTE',updated_at=now() where id=v_driver.id;
    v_event := 'DRIVER_EN_ROUTE';
  elsif p_target='DRIVER_ARRIVED' and v_from_status='DRIVER_EN_ROUTE' then
    update public.ride_requests set status=p_target,arrived_at=now() where id=p_ride_id returning * into v_ride;
    update public.drivers set operational_status='ARRIVED',updated_at=now() where id=v_driver.id;
    v_event := 'DRIVER_ARRIVED';
  elsif p_target='IN_TRIP' and v_from_status='DRIVER_ARRIVED' then
    update public.ride_requests set status=p_target,started_at=now() where id=p_ride_id returning * into v_ride;
    update public.drivers set operational_status='ON_TRIP',updated_at=now() where id=v_driver.id;
    v_event := 'TRIP_STARTED';
  elsif p_target='COMPLETED' and v_from_status='IN_TRIP' then
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
    raise exception 'ILLEGAL_RIDE_TRANSITION % -> %', v_from_status, p_target;
  end if;

  insert into public.ride_events(ride_request_id,event_type,actor_role,actor_id,metadata)
  values (
    p_ride_id,
    v_event,
    'DRIVER',
    auth.uid(),
    jsonb_build_object('from_status',v_from_status,'to_status',p_target)
  );

  return v_ride;
end;
$$;

grant execute on function public.driver_transition_ride(uuid,public.ride_status) to authenticated;

commit;
