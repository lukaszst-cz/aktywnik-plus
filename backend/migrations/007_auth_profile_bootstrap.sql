-- Aktywnik+ migration 007 — auth profile bootstrap
-- Minimalny profil aplikacyjny dla dorosłych logujących się przez Supabase Auth.

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id,display_name,profile_type)
  values (
    new.id,
    left(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'display_name',''),
        nullif(new.raw_user_meta_data ->> 'full_name',''),
        nullif(split_part(coalesce(new.email,''),'@',1),''),
        'Użytkownik'
      ),
      80
    ),
    'adult'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Funkcja jest wyłącznie triggerem; klient nie powinien wywoływać jej jako RPC.
revoke execute on function app_private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_aktywnik on auth.users;

create trigger on_auth_user_created_aktywnik
after insert on auth.users
for each row execute function app_private.handle_new_auth_user();

-- Dzieci nie są tworzone przez zwykły signup.
-- Konto dziecka powstaje wyłącznie w kontrolowanym flow pairing,
-- gdzie backend nada profile_type='child' i relację child_accounts.
