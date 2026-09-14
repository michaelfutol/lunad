begin;

revoke execute on function public.is_staff_for(uuid,uuid) from public;
revoke execute on function public.current_driver_id(uuid,uuid) from public;
revoke execute on function public.can_access_ride(uuid) from public;
revoke execute on function public.can_view_driver_presence(uuid) from public;
revoke execute on function public.create_ride_request(uuid,uuid,text,double precision,double precision,text,double precision,double precision,text,integer,integer,boolean) from public;
revoke execute on function public.dispatch_offer_to_driver(uuid,uuid,uuid,integer,text) from public;
revoke execute on function public.accept_ride_offer(uuid) from public;
revoke execute on function public.driver_transition_ride(uuid,public.ride_status) from public;
revoke execute on function public.update_driver_presence(uuid,public.driver_operational_status,double precision,double precision,numeric,numeric,numeric) from public;
revoke execute on function public.handle_new_auth_user() from public;

grant execute on function public.is_staff_for(uuid,uuid) to authenticated;
grant execute on function public.current_driver_id(uuid,uuid) to authenticated;
grant execute on function public.can_access_ride(uuid) to authenticated;
grant execute on function public.can_view_driver_presence(uuid) to authenticated;
grant execute on function public.create_ride_request(uuid,uuid,text,double precision,double precision,text,double precision,double precision,text,integer,integer,boolean) to authenticated;
grant execute on function public.dispatch_offer_to_driver(uuid,uuid,uuid,integer,text) to authenticated;
grant execute on function public.accept_ride_offer(uuid) to authenticated;
grant execute on function public.driver_transition_ride(uuid,public.ride_status) to authenticated;
grant execute on function public.update_driver_presence(uuid,public.driver_operational_status,double precision,double precision,numeric,numeric,numeric) to authenticated;

commit;
