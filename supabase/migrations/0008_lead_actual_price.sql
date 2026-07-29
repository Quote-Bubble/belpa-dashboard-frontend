-- Actual won-job price entered by the roofer on the Jobs view.
-- Column may already exist on remote; keep this idempotent for repo history.

alter table public.leads
  add column if not exists actual_price_ex_vat numeric;

-- Members may write their own price (alongside status / archived).
-- Do not revoke existing grants; only add this column.
grant update (actual_price_ex_vat) on public.leads to authenticated;
