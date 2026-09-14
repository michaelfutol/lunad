begin;

revoke execute on function public.is_staff_for(uuid,uuid) from anon;
revoke execute on function public.current_driver_id(uuid,uuid) from anon;
revoke execute on function public.can_access_ride(uuid) from anon;
revoke execute on function public.can_view_driver_presence(uuid) from anon;
revoke execute on function public.create_ride_request(uuid,uuid,text,double precision,double precision,text,double precision,double precision,text,integer,integer,boolean) from anon;
revoke execute on function public.dispatch_offer_to_driver(uuid,uuid,uuid,integer,text) from anon;
revoke execute on function public.accept_ride_offer(uuid) from anon;
revoke execute on function public.driver_transition_ride(uuid,public.ride_status) from anon;
revoke execute on function public.update_driver_presence(uuid,public.driver_operational_status,double precision,double precision,numeric,numeric,numeric) from anon;
revoke execute on function public.handle_new_auth_user() from anon;
revoke execute on function public.handle_new_auth_user() from authenticated;

grant execute on function public.is_staff_for(uuid,uuid) to authenticated;
grant execute on function public.current_driver_id(uuid,uuid) to authenticated;
grant execute on function public.can_access_ride(uuid) to authenticated;
grant execute on function public.can_view_driver_presence(uuid) to authenticated;
grant execute on function public.create_ride_request(uuid,uuid,text,double precision,double precision,text,double precision,double precision,text,integer,integer,boolean) to authenticated;
grant execute on function public.dispatch_offer_to_driver(uuid,uuid,uuid,integer,text) to authenticated;
grant execute on function public.accept_ride_offer(uuid) to authenticated;
grant execute on function public.driver_transition_ride(uuid,public.ride_status) to authenticated;
grant execute on function public.update_driver_presence(uuid,public.driver_operational_status,double precision,double precision,numeric,numeric,numeric) to authenticated;

create policy organization_municipalities_authenticated_read on public.organization_municipalities
  for select to authenticated using (is_active);

create policy feature_flags_authenticated_read on public.feature_flags
  for select to authenticated using (
    exists (
      select 1 from public.organization_municipalities om
      where om.organization_id = feature_flags.organization_id
        and (feature_flags.municipality_id is null or om.municipality_id = feature_flags.municipality_id)
        and om.is_active
    )
  );

commit;
