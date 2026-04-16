-- EXECUTIA — Supabase table setup
-- Run in Supabase → SQL Editor

-- 1. LEADS
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  execution_id      text unique not null,
  company           text,
  contact_name      text,
  email             text not null,
  country           text,
  volume            text,
  avg_transaction   text,
  current_system    text,
  payment_type      text,
  risk              text,
  priority          text default 'LOW',   -- LOW / STANDARD / ELEVATED
  status            text default 'NEW',   -- NEW / UNDER_REVIEW / REPLIED / PILOT_SENT / CLOSED
  source            text,                 -- homepage_request / decision_notice
  client_email_sent boolean default false,
  internal_email_sent boolean default false,
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- 2. LEAD ACTIVITY
create table if not exists public.lead_activity (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.leads(id) on delete cascade,
  activity_type text not null,  -- REQUEST_RECEIVED / CLIENT_EMAIL_SENT / INTERNAL_EMAIL_SENT / etc.
  event_type    text generated always as (activity_type) stored,  -- alias for compatibility
  payload       jsonb,
  created_at    timestamptz default now()
);

-- 3. AUTO-UPDATE updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- 4. INDEXES
create index if not exists leads_execution_id_idx on public.leads(execution_id);
create index if not exists leads_email_idx        on public.leads(email);
create index if not exists leads_priority_idx     on public.leads(priority);
create index if not exists leads_status_idx       on public.leads(status);
create index if not exists activity_lead_id_idx   on public.lead_activity(lead_id);

-- 5. RLS (Row Level Security) — service role bypasses this
alter table public.leads         enable row level security;
alter table public.lead_activity enable row level security;

-- Service role has full access (used by API)
-- No anon access needed

-- OPERATOR ACTIVITY LOG
create table if not exists public.operator_activity (
  id           uuid primary key default gen_random_uuid(),
  execution_id text not null,
  event_type   text not null,
  old_status   text,
  new_status   text,
  note         text,
  actor        text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_operator_activity_execution_id
  on public.operator_activity(execution_id);

create index if not exists idx_operator_activity_created_at
  on public.operator_activity(created_at desc);
