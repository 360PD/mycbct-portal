-- Fuzzy global search for the admin bar at the top of the dashboard.
--
-- pg_trgm gives trigram similarity, so "stoy" finds "Dr Nikolas Stoy",
-- "montgomry" finds "Rob Montgomery", and "acorn dentl" still finds
-- "Acorn Dental Clinic". Plain ILIKE can't do that.
--
-- One row per result, scored, best first. Substring hits score above fuzzy
-- ones so exact typing always wins.

create extension if not exists pg_trgm;

-- Indexes so this stays fast as the tables grow.
create index if not exists idx_practices_name_trgm
  on public.practices using gin (name gin_trgm_ops);
create index if not exists idx_patients_first_trgm
  on public.patients using gin (first_name gin_trgm_ops);
create index if not exists idx_patients_last_trgm
  on public.patients using gin (last_name gin_trgm_ops);
create index if not exists idx_referrals_signature_trgm
  on public.referrals using gin (signature_name gin_trgm_ops);

create or replace function public.global_search(q text, lim int default 12)
returns table (
  kind     text,
  title    text,
  subtitle text,
  href     text,
  score    real
)
language sql
stable
as $$
with n as (
  select btrim(coalesce(q, '')) as q
),
-- Dentists: collapse dentist_directory to one row per person.
d as (
  select
    dd.display_name                                        as title,
    count(*)                                               as practice_count,
    sum(dd.referral_count)                                 as referrals,
    min(dd.practice_name)                                  as a_practice,
    min(dd.practice_id::text)                              as a_practice_id,
    bool_or(dd.profile_id is not null)                     as has_login,
    max(greatest(
      similarity(dd.display_name, (select q from n)),
      case when dd.display_name ilike '%' || (select q from n) || '%' then 0.95 else 0 end
    ))                                                     as score
  from public.dentist_directory dd, n
  where n.q <> ''
    and (dd.display_name ilike '%' || n.q || '%'
      or similarity(dd.display_name, n.q) > 0.28)
  group by dd.display_name
)
select
  'dentist'::text,
  d.title,
  case when d.practice_count > 1
       then d.practice_count || ' practices · ' || d.referrals || ' referrals'
       else coalesce(d.a_practice, 'No practice') || ' · ' || d.referrals || ' referrals'
  end || case when d.has_login then ' · has login' else '' end,
  case when d.a_practice_id is not null and d.practice_count = 1
       then '/dashboard?practice=' || d.a_practice_id else '/search?q=' || d.title end,
  d.score::real
from d

union all

select
  'practice',
  p.name,
  coalesce(nullif(p.email, ''), 'no email on record') || ' · ' ||
    (select count(*) from public.referrals r where r.practice_id = p.id) || ' referrals',
  '/dashboard?practice=' || p.id,
  greatest(
    similarity(p.name, n.q),
    case when p.name ilike '%' || n.q || '%' then 0.95 else 0 end,
    case when coalesce(p.email,'') ilike '%' || n.q || '%' then 0.9 else 0 end
  )::real
from public.practices p, n
where n.q <> ''
  and (p.name ilike '%' || n.q || '%'
    or coalesce(p.email,'') ilike '%' || n.q || '%'
    or similarity(p.name, n.q) > 0.28)

union all

select
  'patient',
  pt.first_name || ' ' || pt.last_name,
  coalesce(pr.name, '—') ||
    case when pt.date_of_birth is not null
         then ' · born ' || to_char(pt.date_of_birth, 'DD Mon YYYY') else '' end,
  coalesce('/referrals/' || (
    select r.id::text from public.referrals r
     where r.patient_id = pt.id order by r.created_at desc limit 1), '/search?q=' || pt.last_name),
  greatest(
    similarity(pt.first_name || ' ' || pt.last_name, n.q),
    case when (pt.first_name || ' ' || pt.last_name) ilike '%' || n.q || '%' then 0.95 else 0 end
  )::real
from public.patients pt
left join public.practices pr on pr.id = pt.practice_id, n
where n.q <> ''
  and ((pt.first_name || ' ' || pt.last_name) ilike '%' || n.q || '%'
    or similarity(pt.first_name || ' ' || pt.last_name, n.q) > 0.32)

order by score desc, title
limit lim;
$$;

comment on function public.global_search is
  'Fuzzy admin search across dentists, practices and patients. Used by the dashboard search bar.';
