-- PDF feedback template — copy + color + logo knobs the admin can iterate on.
-- Structure/layout stays in code (lib/pdf/feedback-pdf.tsx).
create table pdf_template_configs (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  name text not null,
  cover_title text not null,
  intro_paragraph text not null,
  worksheet_1_heading text not null,
  worksheet_2_heading text not null,
  worksheet_3_heading text not null,
  closing_paragraph text not null,
  signature_block text not null,
  accent_color text not null default '#2D6A5F',
  logo_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Only one active template at a time
create unique index pdf_template_configs_active_idx
  on pdf_template_configs (is_active) where is_active = true;

-- Public Storage bucket for the logo and any future PDF assets.
insert into storage.buckets (id, name, public)
values ('pdf-assets', 'pdf-assets', true)
on conflict (id) do update set public = excluded.public;

-- Allow public (anonymous) read of anything in the pdf-assets bucket.
-- Uploads are gated through the app (service role), so no public write policy.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'pdf-assets public read'
  ) then
    execute $p$
      create policy "pdf-assets public read"
      on storage.objects for select
      using (bucket_id = 'pdf-assets')
    $p$;
  end if;
end $$;

-- Seed version 1 from the existing Google Doc template copy
insert into pdf_template_configs (
  version,
  name,
  cover_title,
  intro_paragraph,
  worksheet_1_heading,
  worksheet_2_heading,
  worksheet_3_heading,
  closing_paragraph,
  signature_block,
  accent_color,
  is_active
) values (
  1,
  'Initial template',
  'Worksheet Responses and Feedback',
  E'Thank you for participating in the Foundations of Donor Alignment course. We hope the experience was enriching and helps to inform your work and fundraising efforts.\n\nBelow are the answers you provided in the worksheets with insights from Alex based on what you shared. If you have any questions or want to follow up please feel free to connect with us at support@expertfundraising.org or explore the website www.expertfundraising.org.',
  'Worksheet 1: Self-Assessment',
  'Worksheet 2: Applying the Framework',
  'Worksheet 3: Head-Heart-Hara Mapping',
  E'If you haven''t already, be sure to sign up for the free workshop to secure your seat before the next one fills up. You can do so by visiting www.expertfundraising.org.',
  E'Expert Fundraising\nsupport@expertfundraising.org\nwww.expertfundraising.org',
  '#2D6A5F',
  true
);
