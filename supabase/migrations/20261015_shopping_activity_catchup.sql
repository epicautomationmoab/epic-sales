-- Maintain the shopping clock on linked open opportunities; preserve claim ownership.
create or replace function public.epic_refresh_opportunity_shopping()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 update public.sales_opportunities o
 set shopping_last_activity_at=greatest(coalesce(o.shopping_last_activity_at, '-infinity'::timestamptz),new.last_seen_at),
     last_seen_at=greatest(coalesce(o.last_seen_at,'-infinity'::timestamptz),new.last_seen_at),
     updated_at=now()
 from public.sales_opportunity_drafts od
 where od.draft_id=new.id and od.opportunity_id=o.id and o.status='open'
   and new.last_seen_at is not null
   and (o.shopping_last_activity_at is null or o.shopping_last_activity_at<new.last_seen_at);
 return new;
end $$;
drop trigger if exists trg_refresh_opportunity_shopping on public.sales_drafts;
create trigger trg_refresh_opportunity_shopping after update of last_seen_at on public.sales_drafts
for each row when (new.last_seen_at is distinct from old.last_seen_at)
execute function public.epic_refresh_opportunity_shopping();
-- Synchronize existing active opportunity shopping dates without editing assignments or links.
update public.sales_opportunities o
set shopping_last_activity_at=greatest(coalesce(o.shopping_last_activity_at,'-infinity'::timestamptz),fresh.latest),
    last_seen_at=greatest(coalesce(o.last_seen_at,'-infinity'::timestamptz),fresh.latest)
from (
 select od.opportunity_id,max(d.last_seen_at) latest
 from public.sales_opportunity_drafts od join public.sales_drafts d on d.id=od.draft_id
 where d.last_seen_at is not null group by od.opportunity_id
) fresh
where o.id=fresh.opportunity_id and o.status='open'
  and (o.shopping_last_activity_at is null or o.shopping_last_activity_at<fresh.latest);
-- Current owner is authoritative; use stable draft + activity timestamp key so a new shopping edit
-- produces another reviewable item without reviving dismissed older events.
create or replace function public.epic_catchup_shopped_again()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare me public.team_profiles%rowtype; items jsonb;
begin
 select * into me from public.team_profiles where user_id=auth.uid() and active and role<>'workstation' limit 1;
 if me.id is null then raise exception 'Employee login required'; end if;
 select coalesce(jsonb_agg(
 jsonb_build_object(
  'id','reshop:'||d.id::text||':'||extract(epoch from d.last_seen_at)::bigint::text,
  'opportunityId',o.id,'name',coalesce(o.customer_name,d.customer_name,'Customer'),
  'kind','shopped','description','Shopped again: '||coalesce(d.experience_name,'Epic experience')||
  coalesce(' · '||d.confirmation_code,''),
  'at',d.last_seen_at,'dismissed',x.event_key is not null
 ) order by d.last_seen_at desc),'[]'::jsonb) into items
 from public.sales_opportunities o
 join public.sales_opportunity_drafts od on od.opportunity_id=o.id
 join public.sales_drafts d on d.id=od.draft_id
 left join public.sales_catchup_dismissals x on x.profile_id=me.id
  and x.event_key=('reshop:'||d.id::text||':'||extract(epoch from d.last_seen_at)::bigint::text)
 where o.status='open' and o.claimed_by_profile_id=me.id
  and d.last_seen_at>=now()-interval '60 days'
  and d.last_seen_at>coalesce(d.first_seen_at,d.tripworks_created_at,d.created_at)+interval '5 minutes'
  and (d.created_by_user_id is null or d.created_by_user_id is distinct from me.tripworks_user_id)
  and (d.created_by_name is null or d.created_by_name is distinct from me.display_name);
 return items;
end $$;
revoke all on function public.epic_catchup_shopped_again() from public,anon;
grant execute on function public.epic_catchup_shopped_again() to authenticated;
