-- Normly module catalog and per-organization module access
-- Source of truth for which Normly apps an organization may use.
create table if not exists public.normly_module (
  sleutel text primary key,
  naam text not null,
  omschrijving text,
  route text,
  actief boolean not null default true,
  volgorde integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.organisatie_module (
  organisatie_id uuid not null references public.organisatie(id) on delete cascade,
  module_sleutel text not null references public.normly_module(sleutel) on delete cascade,
  actief boolean not null default true,
  ingesteld_op timestamptz not null default now(),
  ingesteld_door uuid references public.gebruiker(id) on delete set null,
  primary key (organisatie_id, module_sleutel)
);

alter table public.normly_module enable row level security;
alter table public.organisatie_module enable row level security;

drop policy if exists "platformbeheer ziet modules" on public.normly_module;
create policy "platformbeheer ziet modules"
on public.normly_module for select
to authenticated
using ((select is_platform_beheerder()));

drop policy if exists "platformbeheer beheert modules" on public.normly_module;
create policy "platformbeheer beheert modules"
on public.normly_module for all
to authenticated
using ((select is_platform_beheerder()))
with check ((select is_platform_beheerder()));

drop policy if exists "platformbeheer ziet organisatie modules" on public.organisatie_module;
create policy "platformbeheer ziet organisatie modules"
on public.organisatie_module for select
to authenticated
using ((select is_platform_beheerder()));

drop policy if exists "platformbeheer beheert organisatie modules" on public.organisatie_module;
create policy "platformbeheer beheert organisatie modules"
on public.organisatie_module for all
to authenticated
using ((select is_platform_beheerder()))
with check ((select is_platform_beheerder()));

grant select, insert, update, delete on public.normly_module to authenticated;
grant select, insert, update, delete on public.organisatie_module to authenticated;

insert into public.normly_module (sleutel, naam, omschrijving, route, actief, volgorde)
values
 ('vgm','VGM APP','Veiligheidsmanagement, inspecties, meldingen en opvolging.','vgm-platform.html',true,10),
 ('werkbonnen','Werkbonnen APP','Opdrachten, planning, uitvoering, uren, materialen en facturatie.','werkbonnen.html',true,20),
 ('toekomst','Toekomstige module','Ruimte voor de volgende Normly-module.','',false,30)
on conflict (sleutel) do update set
 naam=excluded.naam,
 omschrijving=excluded.omschrijving,
 route=excluded.route,
 actief=excluded.actief,
 volgorde=excluded.volgorde;

insert into public.organisatie_module (organisatie_id, module_sleutel, actief)
select o.id, m.sleutel,
       case
         when m.sleutel='vgm' then 'werkplekinspectie' = any(coalesce(o.actieve_modules, '{}'::text[]))
         when m.sleutel='werkbonnen' then 'werkbonnen' = any(coalesce(o.actieve_modules, '{}'::text[]))
         else false
       end
from public.organisatie o
cross join public.normly_module m
on conflict (organisatie_id, module_sleutel) do nothing;
