-- PostgREST upsert (ON CONFLICT DO UPDATE) sets every column in the payload,
-- including roofer_id (to its own value). authenticated had UPDATE on every
-- pricing column except roofer_id, so upserts failed with
-- "permission denied for table roofer_pricing". Granting UPDATE on roofer_id
-- fixes the upsert; RLS (is_roofer_member / is_admin) still gates the row.
grant update (roofer_id) on public.roofer_pricing to authenticated;
