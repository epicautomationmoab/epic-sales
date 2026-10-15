-- Attribute re-shopping on duplicate active trip records to the existing claimed owner.
-- This is read-only: duplicate records and their history remain untouched.
create or replace function public.epic_catchup_shopped_again()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare me public.team_profiles%rowtype; items jsonb;
begin
 select * into me from public.team_profiles where user_id=auth.uid() and active and role<>'workstation' limit 1;
 if me.id is null then raise exception 'Employee login required'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id','reshop:'||q.draft_id::text||':'||extract(epoch from q.last_seen_at)::bigint::text,
  'opportunityId',q.owner_opportunity_id,'name',q.customer_name,
  'kind','shopped','description','Shopped again: '||coalesce(q.experience_name,'Epic experience')||coalesce(' · '||q.confirmation_code,''),
  'at',q.last_seen_at,'dismissed',x.event_key is not null
 ) order by q.last_seen_at desc),'[]'::jsonb) into items
 from (
  select distinct on (d.id) d.id draft_id,d.last_seen_at,d.experience_name,d.confirmation_code,
         coalesce(owned.id,o.id) owner_opportunity_id,coalesce(owned.customer_name,o.customer_name,d.customer_name,'Customer') customer_name
  from public.sales_opportunity_drafts od
  join public.sales_opportunities o on o.id=od.opportunity_id and o.status='open'
  join public.sales_drafts d on d.id=od.draft_id
  left join lateral (
    select candidate.id,candidate.customer_name from public.sales_opportunities candidate
    where candidate.status='open' and candidate.claimed_by_profile_id=me.id
      and candidate.id<>o.id
      and ((candidate.contact_id is not null and candidate.contact_id=o.contact_id)
       or (candidate.person_key is not null and candidate.person_key=o.person_key))
      and candidate.activity_date is not distinct from o.activity_date
    order by candidate.claimed_at nulls last,candidate.created_at asc limit 1
  ) owned on true
  where (o.claimed_by_profile_id=me.id or owned.id is not null)
   and d.last_seen_at>=now()-interval '60 days'
   and d.last_seen_at>coalesce(d.first_seen_at,d.tripworks_created_at,d.created_at)+interval '5 minutes'
   and (d.created_by_user_id is null or d.created_by_user_id is distinct from me.tripworks_user_id)
   and (d.created_by_name is null or d.created_by_name is distinct from me.display_name)
  order by d.id,owned.id nulls last,o.id
 ) q
 left join public.sales_catchup_dismissals x on x.profile_id=me.id and x.event_key=
 ('reshop:'||q.draft_id::text||':'||extract(epoch from q.last_seen_at)::bigint::text);
 return items;
end $$;
revoke all on function public.epic_catchup_shopped_again() from public,anon;
grant execute on function public.epic_catchup_shopped_again() to authenticated;
