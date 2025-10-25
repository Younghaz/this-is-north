-- Bookmarks table for article bookmarking feature
create table if not exists public.bookmarks (
  id bigserial primary key,
  user_id uuid references auth.users not null,
  article_id bigint references articles(id) not null,
  created_at timestamptz not null default now(),
  unique (user_id, article_id)
);

-- Enable Row Level Security
alter table public.bookmarks enable row level security;

-- Policy: Users can insert their own bookmarks
create policy "Users can bookmark articles" on public.bookmarks
  for insert using (auth.uid() = user_id);

-- Policy: Users can view their own bookmarks
create policy "Users can view their bookmarks" on public.bookmarks
  for select using (auth.uid() = user_id);

-- Policy: Users can delete their own bookmarks
create policy "Users can delete their bookmarks" on public.bookmarks
  for delete using (auth.uid() = user_id);
