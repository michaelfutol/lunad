-- Minimal, non-fictional laboratory context.
-- No TODA, terminal, fare-table, permit, or official-policy data is invented here.

begin;

insert into public.organizations(code,name,is_active)
values ('LUNAD','LUNAD Mobility',true)
on conflict(code) do update set name=excluded.name,is_active=true,updated_at=now();

insert into public.municipalities(
  code,name,province,country_code,timezone,currency_code,
  is_laboratory,is_active,default_platform_fee_centavos,default_dispatch_strategy
)
values (
  'SOR-MAG','Santa Magdalena','Sorsogon','PH','Asia/Manila','PHP',
  true,true,100,'HYBRID'
)
on conflict(code) do update set
  name=excluded.name,
  province=excluded.province,
  is_laboratory=true,
  is_active=true,
  default_platform_fee_centavos=100,
  default_dispatch_strategy='HYBRID',
  updated_at=now();

insert into public.organization_municipalities(organization_id,municipality_id,is_active)
select o.id,m.id,true
from public.organizations o, public.municipalities m
where o.code='LUNAD' and m.code='SOR-MAG'
on conflict(organization_id,municipality_id) do update set is_active=true;

insert into public.feature_flags(organization_id,municipality_id,flag_key,enabled,settings)
select o.id,m.id,'ride',true,'{"phase":"LAB"}'::jsonb
from public.organizations o, public.municipalities m
where o.code='LUNAD' and m.code='SOR-MAG'
on conflict(organization_id,municipality_id,flag_key) do update set enabled=true,settings=excluded.settings,updated_at=now();

insert into public.feature_flags(organization_id,municipality_id,flag_key,enabled,settings)
select o.id,m.id,'padyak',true,'{}'::jsonb
from public.organizations o, public.municipalities m
where o.code='LUNAD' and m.code='SOR-MAG'
on conflict(organization_id,municipality_id,flag_key) do update set enabled=true,updated_at=now();

insert into public.feature_flags(organization_id,municipality_id,flag_key,enabled,settings)
select o.id,m.id,'etrike',true,'{}'::jsonb
from public.organizations o, public.municipalities m
where o.code='LUNAD' and m.code='SOR-MAG'
on conflict(organization_id,municipality_id,flag_key) do update set enabled=true,updated_at=now();

insert into public.feature_flags(organization_id,municipality_id,flag_key,enabled,settings)
select o.id,m.id,'tricycle',true,'{}'::jsonb
from public.organizations o, public.municipalities m
where o.code='LUNAD' and m.code='SOR-MAG'
on conflict(organization_id,municipality_id,flag_key) do update set enabled=true,updated_at=now();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profiles(id,full_name,preferred_name,is_test_user)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'preferred_name',''),
    coalesce((new.raw_user_meta_data->>'is_test_user')::boolean,false)
  )
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_lunad on auth.users;
create trigger on_auth_user_created_lunad
after insert on auth.users
for each row execute function public.handle_new_auth_user();

commit;
