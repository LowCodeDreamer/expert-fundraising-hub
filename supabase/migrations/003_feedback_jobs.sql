create type feedback_status as enum (
  'pending',
  'generating',
  'draft',
  'approved',
  'sent'
);

create table feedback_jobs (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade unique,
  status feedback_status not null default 'pending',
  ai_draft jsonb,
  human_edit jsonb,
  reviewer_notes text,
  error_message text,
  triggered_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
