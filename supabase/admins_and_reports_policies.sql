-- Admins table (if not present)
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='admins' and policyname='admins_view') then
    create policy admins_view on public.admins for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='admins' and policyname='admins_insert_self') then
    create policy admins_insert_self on public.admins for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='admins' and policyname='admins_delete_self') then
    create policy admins_delete_self on public.admins for delete using (auth.uid() = id);
  end if;
end $$;

-- Reports table (matches your component field names)
create table if not exists public.reports (
  id bigserial primary key,
  content_type text not null check (content_type in ('comment','article')),
  content_id bigint not null,
  reporter_id uuid,              -- from supabase.auth.getUser().user.id
  reason text not null check (char_length(reason) <= 250),
  status text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  created_at timestamptz not null default now(),
  unique (content_type, content_id, reporter_id)
);
alter table public.reports enable row level security;

do $$
begin
  -- Anyone logged in can insert; change 'true' to 'auth.uid() is not null' if you want to require auth
  if not exists (select 1 from pg_policies where tablename='reports' and policyname='reports_insert_anyone') then
    create policy reports_insert_anyone on public.reports for insert with check (true);
  end if;

  -- Reporter can read their reports
  if not exists (select 1 from pg_policies where tablename='reports' and policyname='reports_select_self') then
    create policy reports_select_self on public.reports for select using (reporter_id is not distinct from auth.uid());
  end if;

  -- Admins see all reports
  if not exists (select 1 from pg_policies where tablename='reports' and policyname='reports_select_admins') then
    create policy reports_select_admins on public.reports for select using (exists (select 1 from public.admins a where a.id = auth.uid()));
  end if;

  -- Admins can update report status
  if not exists (select 1 from pg_policies where tablename='reports' and policyname='reports_update_admins') then
    create policy reports_update_admins on public.reports
      for update using (exists (select 1 from public.admins a where a.id = auth.uid()))
      with check (exists (select 1 from public.admins a where a.id = auth.uid()));
  end if;
end $$;