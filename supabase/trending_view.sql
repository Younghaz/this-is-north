-- Articles view for trending page
create or replace view public.articles_trending as
select
  a.id,
  a.slug,
  a.title,
  a.excerpt,
  a.published_at,
  a.cover_image_path,
  a.cover_image_alt,
  a.likes_count,
  a.comments_count,
  a.views_count,
  a.trending_score
from public.articles a
where a.status = 'published'
order by a.trending_score desc, a.published_at desc, a.id desc;