insert into public.categories (slug, name_en, name_ha) values
('politics','Politics','Siyasa'),
('sports','Sports','Wasanni'),
('religion','Religion','Addini'),
('war','War','Yaƙi'),
('entertainment','Entertainment','Nishadi'),
('history','History','Tarihi'),
('culture','Culture','Al’adu'),
('crime','Crime','Laifi'),
('science-tech','Science & Technology','Kimiyya & Fasaha'),
('business','Business','Kasuwanci'),
('food-stocks','Food & Stocks','Abinci & Hannun Jari')
on conflict (slug) do nothing;

with cat as (
  select id from public.categories where slug='politics' limit 1
)
insert into public.articles (id, locale, slug, title, excerpt, content, category_id, status, published_at)
select
  1,
  'en',
  'sample-slug',
  'Sample Article',
  'This is a sample article.',
  '<p>Full content goes here...</p>',
  cat.id,
  'published',
  now()
from cat
on conflict (id) do nothing;