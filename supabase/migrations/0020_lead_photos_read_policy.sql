-- Let roofers read their own leads' damage photos.
--
-- 0019 created this policy, but only the bucket half of that migration reached
-- production: the backend's uploader creates the bucket on first write, so the
-- bucket existed and the gap stayed invisible. The policy has no such fallback,
-- so every signed-URL request from the dashboard came back "Either the object
-- does not exist or you do not have access to it" while the service role could
-- read the file perfectly well.
--
-- Verified against the live project before writing this: is_roofer_member()
-- returns true for the member, the roofers row is selectable, and
-- foldername[1] is exactly the roofer slug. Every term of the predicate holds,
-- which is what narrows it to the policy simply being absent.
--
-- Idempotent, so it is safe to run whether or not 0019 partially applied.

drop policy if exists "lead_photos_select_member" on storage.objects;

create policy "lead_photos_select_member"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lead-photos'
    and exists (
      select 1
      from public.roofers r
      where r.slug = (storage.foldername(name))[1]
        and public.is_roofer_member(r.id)
    )
  );

-- The bucket must stay private: these are photographs of customers' homes, and
-- the dashboard reads them through short-lived signed URLs. Re-asserted here in
-- case an earlier partial apply left it public.
update storage.buckets set public = false where id = 'lead-photos';
