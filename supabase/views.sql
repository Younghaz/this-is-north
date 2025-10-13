create or replace view public.articles_trending as
select
  a.id,
  a.slug,
  a.title,
  a.excerpt,
  a.published_at,
  a.likes_count,
  a.comments_count,
  (a.likes_count::float / power( (extract(epoch from (now() - coalesce(a.published_at, now()))) / 3600.0) + 2.0, 1.5)) as trending_score
from public.articles a
where a.status = 'published';