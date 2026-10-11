-- Main C360 reads only explicitly linked direct Meta conversations.
create or replace function public.get_c360_linked_social_messages(p_contact_id uuid)
returns table(event_key text,platform text,conversation_uid text,direction text,body text,message_at timestamptz)
language sql security definer set search_path=public as $$
select m.event_key,'facebook'::text,
case when m.sender_id='2178184282240884' then m.recipient_id else m.sender_id end,
case when m.sender_id='2178184282240884' then 'outbound' else 'inbound' end,
m.message_text,coalesce(to_timestamp(m.meta_timestamp_ms/1000.0),m.received_at)
from public.c360_meta_messages m
join public.c360_meta_identity_links l
on l.platform='facebook'
and l.sender_id=case when m.sender_id='2178184282240884' then m.recipient_id else m.sender_id end
where l.contact_id=p_contact_id and m.page_id='2178184282240884'
and exists(select 1 from public.team_profiles t where t.user_id=auth.uid() and t.active and t.role<>'workstation')
order by 6 asc limit 500;
$$;