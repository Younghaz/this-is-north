create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  location text,
  age int,
  photo_url text,
  is_over_13 boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id bigserial primary key,
  slug text unique not null,
  name_en text not null,
  name_ha text not null,
  created_at timestamptz not null default now()
);

create type article_status as enum ('draft', 'published', 'scheduled');

create table if not exists public.articles (
  id bigserial primary key,
  locale text not null check (locale in ('en', 'ha')),
  slug text not null,
  title text not null,
  excerpt text,
  content text not null,
  hero_image_url text,
  category_id bigint not null references public.categories(id) on delete restrict,
  tags text[] default '{}',
  status article_status not null default 'draft',
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (locale, slug)
);

create index on public.articles (status, published_at desc);
create index on public.articles using gin (to_tsvector('simple', title || ' ' || coalesce(excerpt,'') || ' ' || content));
create index on public.articles (category_id);
create index on public.articles (locale);

create table if not exists public.likes (
  id bigserial primary key,
  article_id bigint not null references public.articles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  anon_device_id text,
  created_at timestamptz not null default now(),
  check ((user_id is not null) <> (anon_device_id is not null))
);

create unique index if not exists ux_likes_article_user on public.likes(article_id, user_id) where user_id is not null;
create unique index if not exists ux_likes_article_anon on public.likes(article_id, anon_device_id) where anon_device_id is not null;

create type comment_status as enum ('visible', 'hidden', 'flagged');

create table if not exists public.comments (
  id bigserial primary key,
  article_id bigint not null references public.articles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id bigint references public.comments(id) on delete cascade,
  body text not null,
  status comment_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.comments (article_id, created_at);
create index on public.comments (parent_comment_id);

create table if not exists public.comment_reports (
  id bigserial primary key,
  comment_id bigint not null references public.comments(id) on delete cascade,
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create type admin_role as enum ('admin', 'editor', 'moderator');

create table if not exists public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role admin_role not null default 'admin',
  created_at timestamptz not null default now()
);

create or replace function public.recount_article_engagement() returns trigger language plpgsql as $$
begin
  update public.articles a
  set likes_count = (select count(*) from public.likes l where l.article_id = a.id),
      comments_count = (select count(*) from public.comments c where c.article_id = a.id and c.status = 'visible')
  where a.id = coalesce(new.article_id, old.article_id);
  return null;
end $$;

drop trigger if exists trg_recount_likes on public.likes;
create trigger trg_recount_likes after insert or delete on public.likes
for each row execute function public.recount_article_engagement();

drop trigger if exists trg_recount_comments on public.comments;
create trigger trg_recount_comments after insert or update or delete on public.comments
for each row execute function public.recount_article_engagement();