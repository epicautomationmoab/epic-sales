-- Prepared only. Apply through the normal reviewed release process.
create table if not exists public.sales_followups (
 id uuid primary key default gen_random_uuid(),
 opportunity_id uuid not null references public.sales_opportunities(id),
 created_by_profile_id uuid not null references public.team_profiles(id),
 assigned_to_profile_id uuid not null references public.team_profiles(id),
 title text not null check (length(trim(title)) between 1 and 240),
 context_note text not null default '',
 source text not null default 'c360',
 source_workflow_id uuid unique,
 due_at timestamptz not null,
 status text not null default 'pending' check (status in ('pending','completed','cancelled')),
 outcome text,
 completed_at timestamptz,
 completed_by_profile_id uuid references public.team_profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists sales_followups_assignee_due on public.sales_followups(assigned_to_profile_id, status, due_at);
create index if not exists sales_followups_opportunity on public.sales_followups(opportunity_id, created_at desc);
create table if not exists public.sales_followup_events (
 id uuid primary key default gen_random_uuid(),
 followup_id uuid not null references public.sales_followups(id) on delete cascade,
 actor_profile_id uuid not null references public.team_profiles(id),
 event_type text not null check(event_type in ('created','completed','rescheduled','reassigned','attempted','cancelled')),
 note text,
 previous_due_at timestamptz,
 next_due_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists sales_followup_events_history on public.sales_followup_events(followup_id,created_at);
alter table public.sales_followups enable row level security;
alter table public.sales_followup_events enable row level security;
-- Select for the owner, creator, or supervisors. Do not expose all employee records.
create policy sales_followups_read on public.sales_followups for select to authenticated
 using (
 exists (select 1 from public.team_profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','manager'))
 or exists (select 1 from public.team_profiles p where p.user_id=(select auth.uid()) and p.active and p.id in (assigned_to_profile_id,created_by_profile_id))
 );
create policy sales_followups_insert on public.sales_followups for insert to authenticated
 with check (
 exists (select 1 from public.team_profiles p where p.user_id=(select auth.uid()) and p.active and p.role <> 'workstation' and p.id=created_by_profile_id)
 );
create policy sales_followups_update on public.sales_followups for update to authenticated
 using (
 exists (select 1 from public.team_profiles p where p.user_id=(select auth.uid()) and p.active and (p.id=assigned_to_profile_id or p.role in ('admin','manager')))
 )
 with check (
 exists (select 1 from public.team_profiles p where p.user_id=(select auth.uid()) and p.active and (p.id=assigned_to_profile_id or p.role in ('admin','manager')))
 );
create policy sales_followup_events_read on public.sales_followup_events for select to authenticated
 using (exists(select 1 from public.sales_followups f where f.id=followup_id));
create policy sales_followup_events_insert on public.sales_followup_events for insert to authenticated
 with check (
 exists(select 1 from public.team_profiles p where p.id=actor_profile_id and p.user_id=(select auth.uid()) and p.active and p.role <> 'workstation')
 and exists(select 1 from public.sales_followups f where f.id=followup_id)
 );
grant select,insert,update on public.sales_followups to authenticated;
grant select,insert on public.sales_followup_events to authenticated;
