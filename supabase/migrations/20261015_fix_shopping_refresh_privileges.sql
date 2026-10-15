create or replace function public.epic_refresh_opportunity_shopping()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 update public.sales_opportunities o
 set shopping_last_activity_at=greatest(coalesce(o.shopping_last_activity_at,'-infinity'::timestamptz),new.last_seen_at),
 last_seen_at=greatest(coalesce(o.last_seen_at,'-infinity'::timestamptz),new.last_seen_at),
 updated_at=now()
 from public.sales_opportunity_drafts od
 where od.draft_id=new.id and od.opportunity_id=o.id and o.status='open'
 and new.last_seen_at is not null
 and (o.shopping_last_activity_at is null or o.shopping_last_activity_at<new.last_seen_at);
 return new;
end $$;
-- Reconcile all currently linked open opportunities against the actual latest draft activity.
update public.sales_opportunities o
set shopping_last_activity_at=greatest(coalesce(o.shopping_last_activity_at,'-infinity'::timestamptz),activity.latest),
 last_seen_at=greatest(coalesce(o.last_seen_at,'-infinity'::timestamptz),activity.latest),
 updated_at=now()
from (select od.opportunity_id,max(d.last_seen_at) latest from public.sales_opportunity_drafts od
join public.sales_drafts d on d.id=od.draft_id where d.last_seen_at is not null group by od.opportunity_id) activity
where o.id=activity.opportunity_id and o.status='open'
and (o.shopping_last_activity_at is null or o.shopping_last_activity_at<activity.latest);