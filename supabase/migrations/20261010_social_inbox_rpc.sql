create or replace function public.get_c360_social_inbox()
returns table(thread_key text,kind text,source_id text,occurred_at timestamptz,preview text,subject text,customer_name text,email text,phone text,opportunity_id text,opportunity_status text,lead_value_cents bigint,interest_label text,activity_window_start text,activity_window_end text,assigned_rep_name text,claimed_by_name text,reservation_id text,reservation_confirmation text,lane text,is_open boolean,handled_at timestamptz,platform text)
language sql security definer set search_path=public
as $$
 with latest as (
 select distinct on(m.platform,m.conversation_uid) m.platform,m.conversation_uid,m.event_key,m.body,m.social_display_name,m.social_identifier,coalesce(m.message_at,m.received_at) as at
 from public.c360_social_messages m where m.event_type='message.received'
 order by m.platform,m.conversation_uid,coalesce(m.message_at,m.received_at) desc
 )
 select 'social:'||l.platform||':'||l.conversation_uid,'social'::text,l.event_key,l.at,left(coalesce(l.body,''),180),null::text,coalesce(l.social_display_name,l.social_identifier,'Social contact'),null::text,null::text,null::text,null::text,null::bigint,null::text,null::text,null::text,null::text,null::text,null::text,null::text,'unmatched'::text,true,null::timestamptz,l.platform
 from latest l
 where exists(select 1 from public.team_profiles t where t.user_id=auth.uid() and t.active and t.role<>'workstation')
 order by l.at desc limit 100;
$$;
revoke all on function public.get_c360_social_inbox() from public,anon;
grant execute on function public.get_c360_social_inbox() to authenticated;