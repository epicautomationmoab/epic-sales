create or replace function public.epic_manager_catchup(p_employee uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare actor public.team_profiles%rowtype; result jsonb;
begin
 select * into actor from public.team_profiles where user_id=auth.uid() and active and role in ('admin','manager') limit 1;
 if actor.id is null then raise exception 'Manager access required' using errcode='42501'; end if;
 if not exists(select 1 from public.team_profiles where id=p_employee and active and role<>'workstation') then raise exception 'Employee not found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'id','reshop:'||d.id::text||':'||extract(epoch from d.last_seen_at)::bigint::text,
 'opportunityId',o.id,'name',o.customer_name,'kind','shopped',
 'description','Shopped again: '||coalesce(d.experience_name,'Epic experience'),
 'at',d.last_seen_at,'dismissed',x.event_key is not null
 ) order by d.last_seen_at desc),'[]'::jsonb) into result
 from public.sales_opportunities o
 join public.sales_opportunity_drafts od on od.opportunity_id=o.id
 join public.sales_drafts d on d.id=od.draft_id
 left join public.sales_catchup_dismissals x on x.profile_id=p_employee
 and x.event_key=('reshop:'||d.id::text||':'||extract(epoch from d.last_seen_at)::bigint::text)
 where o.status='open' and o.claimed_by_profile_id=p_employee
 and d.last_seen_at>=now()-interval '60 days'
 and d.last_seen_at>coalesce(d.first_seen_at,d.tripworks_created_at,d.created_at)+interval '5 minutes';
 return result;
end $$;
revoke all on function public.epic_manager_catchup(uuid) from public,anon;
grant execute on function public.epic_manager_catchup(uuid) to authenticated;