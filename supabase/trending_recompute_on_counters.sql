-- Recompute trending when likes_count or comments_count change on articles
create or replace function public.on_article_counters_update()
returns trigger as $$
begin
  if (tg_op = 'UPDATE') then
    if (coalesce(new.likes_count,0) <> coalesce(old.likes_count,0)
        or coalesce(new.comments_count,0) <> coalesce(old.comments_count,0)) then
      update public.articles a
      set trending_score = public.compute_trending_score(
        coalesce(new.likes_count, 0),
        coalesce(new.comments_count, 0),
        coalesce(new.views_count, 0),
        new.published_at
      )
      where a.id = new.id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_article_counters_update on public.articles;
create trigger trg_article_counters_update
after update of likes_count, comments_count on public.articles
for each row execute procedure public.on_article_counters_update();