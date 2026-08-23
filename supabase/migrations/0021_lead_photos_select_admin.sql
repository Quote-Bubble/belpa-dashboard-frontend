-- Admins can inspect a roofer's leads, but until now they could not read the
-- photos those leads were graded from.
--
-- `leads_admin_select` (0009) lets an operator open any quote in the admin
-- hub. The lead-photos bucket only had `lead_photos_select_member`, which
-- requires is_roofer_member() on the slug in the path. A Belpa admin is not
-- a member of Hatherley (or any demo tenant), so createSignedUrls returned
-- a 200 with a null URL per path — which the dashboard surfaces as
-- "Couldn't load the customer's photos just now."
--
-- The file was in the bucket the whole time (service-role upload). This
-- policy mirrors the leads table: members see their own, admins see all.
-- The bucket stays private; reads still go through short-lived signed URLs.

drop policy if exists "lead_photos_select_admin" on storage.objects;

create policy "lead_photos_select_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lead-photos'
    and public.is_admin()
  );
