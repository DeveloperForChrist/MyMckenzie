-- Cleanup helper: map public.users rows with NULL auth_uid to auth.users by email
-- Usage: run this script against your Neon/Postgres database (e.g. via psql or your SQL editor).
-- IMPORTANT: run in a dev/staging project first. Take a DB snapshot if this is prod.

-- 1) List current rows that have no auth_uid (orphan profiles)
select id, email, created_at
from public.users
where auth_uid is null
order by created_at desc
limit 200;

-- 2) Dry-run: show potential matches in auth.users by email (case-insensitive)
-- This does NOT change data; it shows which auth.users row would be used.
select u.id as profile_id, u.email as profile_email, a.id as auth_id, a.email as auth_email
from public.users u
left join auth.users a on lower(u.email) = lower(a.email)
where u.auth_uid is null
order by u.created_at desc
limit 200;

-- 3) Non-destructive update: set auth_uid where a matching auth.users row exists
-- This maps by email and only updates rows where a match is found.
begin;
with matched as (
  update public.users u
  set auth_uid = a.id::text, updated_at = now()
  from auth.users a
  where u.auth_uid is null
    and u.email is not null
    and lower(u.email) = lower(a.email)
  returning u.id, u.email, a.id as matched_auth_id
)
select count(*) as rows_updated from matched;
commit;

-- 4) Verify remaining orphan rows (if any)
select id, email, created_at from public.users where auth_uid is null order by created_at desc limit 200;

-- 5) OPTIONAL: remove orphan rows (DESTRUCTIVE) - run only after manual review
-- DELETE FROM public.users WHERE auth_uid IS NULL;

-- End of cleanup script
