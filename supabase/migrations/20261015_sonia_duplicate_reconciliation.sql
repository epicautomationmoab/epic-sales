-- One-time, guarded reconciliation for the only verified duplicate customer/date group.
-- Preserve source row and all its existing child links as an inactive historical record.
do $$
declare owned public.sales_opportunities%rowtype; duplicate public.sales_opportunities%rowtype;
begin
 select * into owned from public.sales_opportunities where id='c0a75c1b-f87d-418b-badf-bacdad36e112' for update;
 select * into duplicate from public.sales_opportunities where id='00cd421b-e36c-492b-9a1b-b974fb087c80' for update;
 if owned.id is null or duplicate.id is null
 or owned.customer_name<>'Sonia Piloto' or duplicate.customer_name<>'Sonia Piloto'
 or owned.status<>'open' or duplicate.status<>'open'
 or owned.contact_id is distinct from duplicate.contact_id
 or owned.activity_date is distinct from duplicate.activity_date
 or owned.claimed_by_profile_id is null or duplicate.claimed_by_profile_id is not null
 then raise exception 'Sonia consolidation preconditions changed; abort'; end if;
 if exists(select 1 from public.sales_followups where opportunity_id=duplicate.id)
 or exists(select 1 from public.sales_opportunity_notes where opportunity_id=duplicate.id)
 or exists(select 1 from public.sales_quotes where opportunity_id=duplicate.id)
 or exists(select 1 from public.sales_lead_call_workflows where opportunity_id=duplicate.id)
 or exists(select 1 from public.sales_opportunity_assignment_history where opportunity_id=duplicate.id)
 or exists(select 1 from public.callrail_calls where matched_opportunity_id=duplicate.id)
 or exists(select 1 from public.callrail_text_messages where matched_opportunity_id=duplicate.id)
 or exists(select 1 from public.gmail_messages where matched_sales_opportunity_id=duplicate.id)
 then raise exception 'Dependent customer activity detected; abort'; end if;
 insert into public.sales_opportunity_drafts(opportunity_id,draft_id)
 select owned.id,draft_id from public.sales_opportunity_drafts where opportunity_id=duplicate.id
 on conflict do nothing;
 update public.sales_opportunities set
  draft_count=(select count(*) from public.sales_opportunity_drafts where opportunity_id=owned.id),
  shopping_last_activity_at=greatest(coalesce(owned.shopping_last_activity_at,'-infinity'::timestamptz),coalesce(duplicate.shopping_last_activity_at,'-infinity'::timestamptz)),
  last_seen_at=greatest(coalesce(owned.last_seen_at,'-infinity'::timestamptz),coalesce(duplicate.last_seen_at,'-infinity'::timestamptz)),
  updated_at=now()
 where id=owned.id;
 update public.sales_opportunities set status='retired',outcome_reason='consolidated_duplicate',outcome_note='Historical duplicate consolidated into existing Lonnie-owned opportunity; original draft and record retained.',closed_at=now(),updated_at=now() where id=duplicate.id;
end $$;