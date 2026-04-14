create table worksheet_submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  worksheet_number integer not null check (worksheet_number in (1, 2, 3)),
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  unique(participant_id, worksheet_number)
);
