create table if not exists public.course_content (
  scope_key text not null,
  course_id text not null,
  is_shared boolean not null default false,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (scope_key, course_id)
);

create index if not exists course_content_scope_updated_idx
  on public.course_content (scope_key, updated_at desc);

create index if not exists course_content_payload_gin_idx
  on public.course_content using gin (payload jsonb_path_ops);

comment on column public.course_content.payload is
  'Normalized course JSON, including chapter subsections with PGN text, quiz questions, and FEN positions.';

alter table public.course_content enable row level security;

create policy "Allow public course content reads"
  on public.course_content for select
  using (true);

create policy "Allow anon course content writes"
  on public.course_content for insert
  with check (true);

create policy "Allow anon course content updates"
  on public.course_content for update
  using (true)
  with check (true);

create policy "Allow anon course content deletes"
  on public.course_content for delete
  using (true);

insert into storage.buckets (id, name, public)
values
  ('course-content', 'course-content', true),
  ('profile-pictures', 'profile-pictures', true)
on conflict (id) do update set public = excluded.public;

create policy "Allow public course media reads"
  on storage.objects for select
  using (bucket_id in ('course-content', 'profile-pictures'));

create policy "Allow anon course media uploads"
  on storage.objects for insert
  with check (bucket_id in ('course-content', 'profile-pictures'));

create policy "Allow anon course media updates"
  on storage.objects for update
  using (bucket_id in ('course-content', 'profile-pictures'))
  with check (bucket_id in ('course-content', 'profile-pictures'));
