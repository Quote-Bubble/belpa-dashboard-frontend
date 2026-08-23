-- Fix the roofer read policy on lead photos.
--
-- 0019 wrote `storage.foldername(name)` inside a subquery over public.roofers.
-- roofers has its own `name` column, so the unqualified reference bound to the
-- INNER table rather than the outer one: Postgres resolved it as
-- `storage.foldername(r.name)`, comparing r.slug against the first path segment
-- of the roofer's display name ("Belpa Landing Demo") instead of the object's
-- path ("belpa-landing-demo/<lead>/1.jpg").
--
-- That is never equal, so the policy matched no rows. Every signed-URL request
-- from the dashboard returned "Either the object does not exist or you do not
-- have access to it" while the service role read the same file perfectly well,
-- and each term of the predicate tested true in isolation — is_roofer_member()
-- returns true, the roofers row is selectable, the slug equals foldername[1].
-- Only the binding was wrong, which is exactly what a term-by-term check
-- cannot see.
--
-- Qualifying the column as objects.name binds it to storage.objects again.
-- Verified after applying: the member gets a signed URL that downloads the
-- image (200, image/jpeg).

drop policy if exists "lead_photos_select_member" on storage.objects;

create policy "lead_photos_select_member"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lead-photos'
    and exists (
      select 1
      from public.roofers r
      where r.slug = (storage.foldername(objects.name))[1]
        and public.is_roofer_member(r.id)
    )
  );

-- These are photographs of customers' homes: the bucket stays private and the
-- dashboard reads through short-lived signed URLs.
update storage.buckets set public = false where id = 'lead-photos';
