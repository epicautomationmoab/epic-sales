create or replace function public.epic_sales_release_claim(p_opportunity_id uuid,p_reason text,p_note text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare actor public.team_profiles%rowtype; lead public.sales_opportunities%rowtype;
begin
 select * into actor from public.team_profiles where user_id=auth.uid() and active and role<>'workstation' limit 1;
 if actor.id is null then raise exception 'Employee login required' using errcode='42501'; end if;
 if length(btrim(coalesce(p_reason,'')))<3 or length(btrim(coalesce(p_note,'')))<10 then
 raise exception 'Release reason and explanation (at least 10 characters) required'; end if;
 select * into lead from public.sales_opportunities where id=p_opportunity_id for update;
 if lead.id is null or lead.status<>'open' then raise exception 'Open opportunity required'; end if;
 if lead.claimed_by_profile_id is null then raise exception 'Opportunity is not claimed'; end if;
 if actor.id<>lead.claimed_by_profile_id and actor.role not in ('manager','admin') then raise exception 'Not your claim'; end if;
 if exists(select 1 from public.sales_followups where opportunity_id=lead.id and status='pending') then
 raise exception 'Resolve or reassign pending follow-ups before releasing this claim'; end if;
 insert into public.sales_opportunity_notes(opportunity_id,author_profile_id,author_name,note_text)
 values(lead.id,actor.id,actor.display_name,'Claim released ('||left(btrim(p_reason),100)||'): '||left(btrim(p_note),2000));
 update public.sales_opportunity_assignment_history set unassigned_at=now()
 where opportunity_id=lead.id and unassigned_at is null;
 update public.sales_opportunities set claimed_at=null,claimed_by_profile_id=null,claimed_by_name=null,
 assigned_rep_name=null,assigned_rep_tw_user_id=null,new_unclaimed_at=now(),updated_at=now()
 where id=lead.id;
 return jsonb_build_object('ok',true,'released',true,'opportunity_id',lead.id);
end $$;
revoke all on function public.epic_sales_release_claim(uuid,text,text) from public,anon;
grant execute on function public.epic_sales_release_claim(uuid,text,text) to authenticated;