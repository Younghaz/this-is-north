create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, is_over_13)
  values (
    new.id,
    lower(coalesce(split_part(new.email, '@', 1), 'user')) || '_' ||
      substring(replace(uuid_generate_v4()::text, '-', '') from 1 for 6),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();