-- Deploy status is binary now: "to set up" (prospect) or live. We set the
-- widget up ourselves, so the "sent" stage never applied. Applied to the live
-- project via the MCP.
update public.roofers set deploy_status = 'prospect' where deploy_status = 'sent';

alter table public.roofers drop constraint if exists roofers_deploy_status_check;
alter table public.roofers
  add constraint roofers_deploy_status_check
  check (deploy_status in ('prospect', 'live'));
