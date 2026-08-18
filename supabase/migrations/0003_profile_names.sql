-- Add editable account profile names and keep them in sync with auth metadata.
alter table public.profiles
  add column if not exists display_name text check (char_length(display_name) <= 80);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, left(new.raw_user_meta_data ->> 'display_name', 80))
  on conflict (user_id) do update
    set email = excluded.email, display_name = excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_updated on auth.users;
create trigger on_auth_user_profile_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();
