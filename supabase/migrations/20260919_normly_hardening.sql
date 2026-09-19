-- Normly hardening: Werkbonnen RLS, authenticated-only policies and stable function search paths
alter table public.werkbon enable row level security;

alter policy "werkbon: administratie verwijdert werkbonnen" on public.werkbon to authenticated;
alter policy "werkbon: kantoor maakt werkbonnen" on public.werkbon to authenticated;
alter policy "werkbon: werkbonnen wijzigen" on public.werkbon to authenticated;
alter policy "werkbon: werkbonnen zien" on public.werkbon to authenticated;
alter policy "werkbon: beheerder beheert werkbonrollen" on public.werkbon_gebruiker to authenticated;
alter policy "werkbon: leden zien werkbonrollen" on public.werkbon_gebruiker to authenticated;

alter function public.handle_new_user() set search_path = public;
alter function public.huidige_organisatie_id() set search_path = public;
alter function public.huidige_rol() set search_path = public;
alter function public.log_audit_trail() set search_path = public;
alter function public.maak_actiepunt_bij_afwijking() set search_path = public;
alter function public.set_updated_at() set search_path = public;
