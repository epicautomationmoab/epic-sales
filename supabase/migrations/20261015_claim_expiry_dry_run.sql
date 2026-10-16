create or replace function public.epic_sales_claim_expiry_preview()
returns table(opportunity_id uuid,customer_name text,owner_name text,last_meaningful_activity timestamptz,days_inactive integer,pending_followups bigint)
language sql security definer set search_path=''
as $$
with activity as (
 select o.id,o.customer_name,o.claimed_by_name,o.claimed_at,
 greatest(o.claimed_at,
 coalesce((select max(n.created_at) from public.sales_opportunity_notes n where n.opportunity_id=o.id and n.author_profile_id=o.claimed_by_profile_id),o.claimed_at),
 coalesce((select max(f.updated_at) from public.sales_followups f where f.opportunity_id=o.id and f.assigned_to_profile_id=o.claimed_by_profile_id),o.claimed_at),
 coalesce(o.shopping_last_activity_at,o.claimed_at)) as latest,
 (select count(*) from public.sales_followups f where f.opportunity_id=o.id and f.status='pending') as pending
 from public.sales_opportunities o where o.status='open' and o.claimed_by_profile_id is not null
)
select a.id,a.customer_name,a.claimed_by_name,a.latest,floor(extract(epoch from (now()-a.latest))/86400)::integer,a.pending
from activity a where a.latest<now()-interval '10 days' and a.pending=0
order by a.latest asc;
$$;
revoke all on function public.epic_sales_claim_expiry_preview() from public,anon,authenticated;
grant execute on function public.epic_sales_claim_expiry_preview() to service_role;