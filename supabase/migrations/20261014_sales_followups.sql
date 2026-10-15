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

-- Follow-up data is deliberately not exposed through direct table grants.
-- The following narrow RPC entrypoints perform explicit employee authorization.
revoke all on public.sales_followups from anon, authenticated;
revoke all on public.sales_followup_events from anon, authenticated;

create or replace function public.epic_followup_list(p_scope text default 'mine',p_opportunity_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor public.team_profiles%rowtype; result jsonb;
begin
 select * into actor from public.team_profiles where user_id=auth.uid() and active and role<>'workstation' limit 1;
 if actor.id is null then raise exception 'Employee login required'; end if;
 if p_scope='team' and actor.role not in ('admin','manager') then raise exception 'Manager access required'; end if;
 select coalesce(jsonb_agg(x order by x.due_at asc), '[]'::jsonb) into result
 from (
 select f.id,f.opportunity_id,f.created_by_profile_id,f.assigned_to_profile_id,f.title,f.context_note,
        f.due_at,f.status,f.outcome,f.completed_at,f.completed_by_profile_id,f.created_at,
        o.customer_name,creator.display_name as created_by_name,assignee.display_name as assigned_to_name
 from public.sales_followups f
 join public.sales_opportunities o on o.id=f.opportunity_id
 join public.team_profiles creator on creator.id=f.created_by_profile_id
 join public.team_profiles assignee on assignee.id=f.assigned_to_profile_id
 where (p_opportunity_id is null or f.opportunity_id=p_opportunity_id)
 and (case when p_scope='team' then actor.role in ('admin','manager')
           when p_scope='customer' then f.assigned_to_profile_id=actor.id or f.created_by_profile_id=actor.id or actor.role in ('admin','manager')
           else f.assigned_to_profile_id=actor.id end)
 order by f.due_at limit 400
 ) x;
 return result;
end $$;

create or replace function public.epic_followup_members()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare aid uuid;
begin
 select id into aid from public.team_profiles where user_id=auth.uid() and active and role<>'workstation' limit 1;
 if aid is null then raise exception 'Employee login required'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name) order by display_name),'[]'::jsonb)
 from public.team_profiles where active and role<>'workstation');
end $$;

create or replace function public.epic_followup_create(
 p_opportunity_id uuid,p_assignee uuid,p_title text,p_note text,p_due_at timestamptz,
 p_source text default 'c360',p_workflow_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor public.team_profiles%rowtype; f public.sales_followups%rowtype;
begin
 select * into actor from public.team_profiles where user_id=auth.uid() and active and role<>'workstation' limit 1;
 if actor.id is null then raise exception 'Employee login required'; end if;
 if p_title is null or length(btrim(p_title)) not between 1 and 240 or p_due_at is null then raise exception 'Task and date required'; end if;
 if not exists(select 1 from public.sales_opportunities where id=p_opportunity_id) then raise exception 'Sales opportunity not found'; end if;
 if not exists(select 1 from public.team_profiles where id=p_assignee and active and role<>'workstation') then raise exception 'Active employee required'; end if;
 insert into public.sales_followups(opportunity_id,created_by_profile_id,assigned_to_profile_id,title,context_note,due_at,source,source_workflow_id)
 values(p_opportunity_id,actor.id,p_assignee,btrim(p_title),left(coalesce(p_note,''),3000),p_due_at,left(coalesce(p_source,'c360'),80),p_workflow_id)
 on conflict (source_workflow_id) do nothing returning * into f;
 if f.id is null then select * into f from public.sales_followups where source_workflow_id=p_workflow_id; end if;
 if f.id is null then raise exception 'Unable to create follow-up'; end if;
 if not exists(select 1 from public.sales_followup_events where followup_id=f.id and event_type='created') then
 insert into public.sales_followup_events(followup_id,actor_profile_id,event_type,next_due_at)
 values(f.id,actor.id,'created',f.due_at); end if;
 return to_jsonb(f);
end $$;

create or replace function public.epic_followup_action(
 p_id uuid,p_action text,p_outcome text default null,p_note text default null,
 p_due_at timestamptz default null,p_assignee uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor public.team_profiles%rowtype; f public.sales_followups%rowtype; previous timestamptz;
begin
 select * into actor from public.team_profiles where user_id=auth.uid() and active and role<>'workstation' limit 1;
 if actor.id is null then raise exception 'Employee login required'; end if;
 select * into f from public.sales_followups where id=p_id for update;
 if f.id is null then raise exception 'Follow-up not found'; end if;
 if actor.role not in ('admin','manager') and actor.id<>f.assigned_to_profile_id then raise exception 'Not assigned to this follow-up'; end if;
 previous:=f.due_at;
 if f.status<>'pending' then raise exception 'Follow-up is already closed'; end if;
 if p_action='complete' then
   if p_outcome not in ('contacted','booked','no_longer_needed') or nullif(btrim(coalesce(p_note,'')),'') is null then
     raise exception 'Completion requires an outcome and explanation'; end if;
   update public.sales_followups set status='completed',outcome=p_outcome,completed_at=now(),completed_by_profile_id=actor.id,updated_at=now() where id=p_id;
 elsif p_action='attempt' then
   if p_outcome not in ('no_answer','voicemail') then raise exception 'Attempt outcome required'; end if;
 elsif p_action='reschedule' then
   if p_due_at is null then raise exception 'New date required'; end if;
   update public.sales_followups set due_at=p_due_at,updated_at=now() where id=p_id;
 elsif p_action='reassign' then
   if not exists(select 1 from public.team_profiles where id=p_assignee and active and role<>'workstation') then raise exception 'Active employee required'; end if;
   update public.sales_followups set assigned_to_profile_id=p_assignee,updated_at=now() where id=p_id;
 else raise exception 'Invalid action'; end if;
 insert into public.sales_followup_events(followup_id,actor_profile_id,event_type,note,previous_due_at,next_due_at)
 values(p_id,actor.id,case when p_action='attempt' then 'attempted' when p_action='reassign' then 'reassigned' when p_action='complete' then 'completed' else 'rescheduled' end,
 left(concat_ws(': ',p_outcome,p_note),3000),previous,p_due_at);
 return (select to_jsonb(z) from public.sales_followups z where z.id=p_id);
end $$;
revoke all on function public.epic_followup_list(text,uuid) from public,anon;
revoke all on function public.epic_followup_members() from public,anon;
revoke all on function public.epic_followup_create(uuid,uuid,text,text,timestamptz,text,uuid) from public,anon;
revoke all on function public.epic_followup_action(uuid,text,text,text,timestamptz,uuid) from public,anon;
grant execute on function public.epic_followup_list(text,uuid) to authenticated;
grant execute on function public.epic_followup_members() to authenticated;
grant execute on function public.epic_followup_create(uuid,uuid,text,text,timestamptz,text,uuid) to authenticated;
grant execute on function public.epic_followup_action(uuid,text,text,text,timestamptz,uuid) to authenticated;

create or replace function public.epic_followup_history(p_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor public.team_profiles%rowtype; f public.sales_followups%rowtype;
begin
 select * into actor from public.team_profiles where user_id=auth.uid() and active and role<>'workstation' limit 1;
 if actor.id is null then raise exception 'Employee login required'; end if;
 select * into f from public.sales_followups where id=p_id;
 if f.id is null or (actor.role not in ('admin','manager') and actor.id not in (f.assigned_to_profile_id,f.created_by_profile_id)) then raise exception 'Follow-up not accessible'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('type',e.event_type,'note',e.note,'actor',p.display_name,'at',e.created_at,'previous_due_at',e.previous_due_at,'next_due_at',e.next_due_at) order by e.created_at asc),'[]'::jsonb)
 from public.sales_followup_events e join public.team_profiles p on p.id=e.actor_profile_id where e.followup_id=p_id);
end $$;
revoke all on function public.epic_followup_history(uuid) from public,anon;
grant execute on function public.epic_followup_history(uuid) to authenticated;
