create table participants (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  course_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
