-- dentist_directory — one row per (dentist name, practice).
--
-- Why a view: "a dentist" lives in two places in this database.
--   1. profiles (role = 'dentist')  — the 15 people who have a login
--   2. referrals.signature_name     — free text, 134 distinct names, and the
--                                     only record of who referred on the
--                                     ~2,400 historical rows imported from Box
--
-- Searching only profiles would miss almost every dentist we have. This view
-- unions both, so admin search finds a dentist whether or not they've ever
-- signed in.
--
-- A dentist can legitimately appear more than once — either because they refer
-- from two practices, or because the practice is duplicated in the data. Both
-- are worth seeing, so the view keeps the rows separate and the UI groups them.
--
-- security_invoker = on: the view does not grant anything the caller couldn't
-- already read. The admin search page uses the service-role key, which bypasses
-- RLS anyway; this keeps the view safe if it's ever queried as a normal user.

create or replace view public.dentist_directory
with (security_invoker = on) as

with signatures as (
  select
    btrim(r.signature_name)   as display_name,
    r.practice_id             as practice_id,
    count(*)::int             as referral_count,
    max(r.created_at)         as last_referral_at
  from public.referrals r
  where r.signature_name is not null
    and btrim(r.signature_name) <> ''
  group by btrim(r.signature_name), r.practice_id
),

logins as (
  select
    pf.id as profile_id,
    coalesce(
      nullif(btrim(pf.full_name), ''),
      nullif(btrim(pf.signature_name), ''),
      pf.email
    ) as display_name,
    pf.email,
    pf.practice_id
  from public.profiles pf
  where pf.role = 'dentist'
),

-- Every practice a login is attached to: their home practice plus any extra
-- links in dentist_practices.
login_practices as (
  select profile_id, display_name, email, practice_id
  from logins
  where practice_id is not null
  union
  select l.profile_id, l.display_name, l.email, dp.practice_id
  from logins l
  join public.dentist_practices dp on dp.dentist_id = l.profile_id
)

-- Names that appear on referrals, with their login attached where we can match it.
select
  s.display_name,
  lower(s.display_name)  as match_key,
  s.practice_id,
  pr.name                as practice_name,
  s.referral_count,
  s.last_referral_at,
  lp.profile_id,
  lp.email               as profile_email
from signatures s
left join public.practices pr on pr.id = s.practice_id
left join login_practices lp
  on lower(lp.display_name) = lower(s.display_name)
 and lp.practice_id = s.practice_id

union all

-- Logins that have never had a referral filed under their name at that practice.
select
  lp.display_name,
  lower(lp.display_name),
  lp.practice_id,
  pr.name,
  0,
  null::timestamptz,
  lp.profile_id,
  lp.email
from login_practices lp
left join public.practices pr on pr.id = lp.practice_id
where not exists (
  select 1
  from signatures s
  where lower(s.display_name) = lower(lp.display_name)
    and s.practice_id is not distinct from lp.practice_id
);

comment on view public.dentist_directory is
  'Unified dentist list for admin search: referral signature names plus dentist logins. One row per (dentist, practice).';
