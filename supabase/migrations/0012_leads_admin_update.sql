-- Full operator control: admins can update leads (status, archive, actual
-- price) for any roofer. Column grants already allow authenticated updates on
-- status / archived / actual_price_ex_vat; this adds the RLS path for admins.

drop policy if exists "leads_admin_update" on public.leads;
create policy "leads_admin_update"
  on public.leads
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
