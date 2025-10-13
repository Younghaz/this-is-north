-- Enable RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reports enable row level security;
alter table public.admins enable row level security;

-- Profiles
drop policy if exists "Public read limited profiles" on public.profiles;
create policy "Public read limited profiles" on public.profiles
for select using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- Categories
drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories
for select using (true);

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
for all using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Articles
drop policy if exists "Public read published articles" on public.articles;
create policy "Public read published articles" on public.articles
for select using (status = 'published');

drop policy if exists "Admins manage articles" on public.articles;
create policy "Admins manage articles" on public.articles
for all using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Likes
drop policy if exists "Read likes for published articles" on public.likes;
create policy "Read likes for published articles" on public.likes
for select using (exists (
  select 1 from public.articles a where a.id = article_id and a.status = 'published'
));

drop policy if exists "Insert likes for published articles" on public.likes;
create policy "Insert likes for published articles" on public.likes
for insert with check (exists (
  select 1 from public.articles a where a.id = article_id and a.status = 'published'
));

drop policy if exists "Delete own like or admin" on public.likes;
create policy "Delete own like or admin" on public.likes
for delete using (
  (user_id is not null and user_id = auth.uid())
  or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

-- Comments
drop policy if exists "Read visible comments on published articles" on public.comments;
create policy "Read visible comments on published articles" on public.comments
for select using (
  status = 'visible' and exists (
    select 1 from public.articles a where a.id = article_id and a.status = 'published'
  )
);

drop policy if exists "Users insert comments" on public.comments;
create policy "Users insert comments" on public.comments
for insert with check (
  auth.uid() = user_id
  and (select email_confirmed_at is not null from auth.users u where u.id = auth.uid())
  and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
);

drop policy if exists "Users update own comment or admin" on public.comments;
create policy "Users update own comment or admin" on public.comments
for update using (
  user_id = auth.uid() or exists (select 1 from public.admins a where a.user_id = auth.uid())
) with check (
  user_id = auth.uid() or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

drop policy if exists "Users delete own comment or admin" on public.comments;
create policy "Users delete own comment or admin" on public.comments
for delete using (
  user_id = auth.uid() or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

-- Comment reports
drop policy if exists "Read own reports or admin" on public.comment_reports;
create policy "Read own reports or admin" on public.comment_reports
for select using (
  reporter_user_id = auth.uid() or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

drop policy if exists "Insert reports (auth only)" on public.comment_reports;
create policy "Insert reports (auth only)" on public.comment_reports
for insert with check (reporter_user_id = auth.uid());

-- Admins
drop policy if exists "Admins manage admins" on public.admins;
create policy "Admins manage admins" on public.admins
for all using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins read admins" on public.admins;
create policy "Admins read admins" on public.admins
for select using (exists (select 1 from public.admins a where a.user_id = auth.uid()));