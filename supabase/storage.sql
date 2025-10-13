select storage.create_bucket('media', public := true);

alter table storage.objects enable row level security;

drop policy if exists "Public read media" on storage.objects;
create policy "Public read media"
on storage.objects for select
using (bucket_id = 'media');

drop policy if exists "Admins write media" on storage.objects;
create policy "Admins write media"
on storage.objects for all
using (
  bucket_id = 'media' and exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'media' and exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  )
);