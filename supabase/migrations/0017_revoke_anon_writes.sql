-- Take write grants away from `anon`.
--
-- Audit finding: `anon` held INSERT and UPDATE on every column of every table
-- in `public` — including `admins.user_id`, which is the row that decides who
-- is an administrator.
--
-- This was not exploitable. RLS is enabled on all six tables and not one policy
-- admits `anon`, so Postgres denied every write regardless of the grant. The
-- grants came from Supabase's default `grant all on all tables to anon` and had
-- simply never been narrowed.
--
-- But "not exploitable" was resting entirely on RLS. A single permissive policy
-- written `to public` instead of `to authenticated`, or one table created with
-- RLS left off, and an anonymous request could make itself an admin. That is
-- one mistake away, not several, and the mistake is an easy one to make.
--
-- Nothing writes as `anon`. Verified across the whole codebase: every write
-- originates in the dashboard as an authenticated user, and the backend's lead
-- pipeline uses the service role, which bypasses both grants and RLS. So this
-- removes a capability that is used by nobody and needed by nothing.
--
-- SELECT is deliberately left alone. Revoking it changes no behaviour either
-- (RLS still gates reads) but it is the grant most likely to be depended on by
-- something not yet written, and there is no defence-in-depth argument for
-- removing read access that RLS already denies.

revoke insert, update, delete on all tables in schema public from anon;

-- Default privileges apply to tables created later. Without this, the next
-- migration that adds a table silently reintroduces exactly what we just fixed.
alter default privileges in schema public
  revoke insert, update, delete on tables from anon;

-- Belt and braces on the one that actually matters: `admins` decides who can
-- read every lead in the system and edit every roofer. Deny both write and read
-- to anon explicitly, so it survives someone later re-granting broadly.
revoke all on table public.admins from anon;
