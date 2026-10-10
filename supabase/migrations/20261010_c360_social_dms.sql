-- Social DMs remain independent from SMS and customer records.
create table if not exists public.c360_social_messages (
 event_key text primary key,
 provider text not null default 'podium',
 platform text not null check (platform in ('instagram','facebook')),
 conversation_uid text not null,
 social_identifier text,
 podium_contact_uid text,
 social_display_name text,
 location_uid uuid not null,
 direction text not null check (direction in ('inbound','outbound')),
 event_type text not null check (event_type in ('message.received','message.sent','message.failed')),
 message_uid text,
 body text,
 message_at timestamptz,
 received_at timestamptz not null default now(),
 raw_payload jsonb not null
);
create index if not exists c360_social_messages_conversation_idx on public.c360_social_messages(platform,conversation_uid,message_at desc);
alter table public.c360_social_messages enable row level security;
revoke all on public.c360_social_messages from anon,authenticated;
grant select,insert on public.c360_social_messages to service_role;

create table if not exists public.c360_social_identity_links (
 platform text not null check (platform in ('instagram','facebook')),
 conversation_uid text not null,
 contact_id text not null,
 linked_by uuid not null,
 linked_at timestamptz not null default now(),
 primary key(platform,conversation_uid)
);
alter table public.c360_social_identity_links enable row level security;
revoke all on public.c360_social_identity_links from anon,authenticated;
grant select,insert,update,delete on public.c360_social_identity_links to service_role;

comment on table public.c360_social_messages is 'Provider-specific social DM mirror; no inferred customer phone or automatic contact matching.';
comment on table public.c360_social_identity_links is 'Explicit verified staff link between a social conversation and a C360 customer.';
