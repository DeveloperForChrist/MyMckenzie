
-- SIGNUP_AUDIT: track signup attempts for debugging
create table if not exists public.signup_audit (
  id bigint generated always as identity primary key,
  auth_uid text, -- if available
  email text,
  first_name text,
  last_name text,
  ip_addr inet,
  user_agent text,
  success boolean default false,
  error text,
  created_at timestamptz default now()
);
create index if not exists idx_signup_audit_email on public.signup_audit(email);
alter table public.signup_audit enable row level security;

-- Allow inserts from clients (we accept audit inserts from anon clients). Be careful —
-- do not expose sensitive data in the audit. This policy allows anyone to insert
-- an audit row but only the owner (auth_uid match) or admins (if implemented) to view.
create policy "signup_audit_insert" on public.signup_audit
  for insert with check (true);

create policy "signup_audit_select_owner" on public.signup_audit
  for select using (
    auth.uid()::text = auth_uid
    or auth.role() = 'service_role'
  );

create policy "signup_audit_delete_admin" on public.signup_audit
  for delete using (auth.role() = 'service_role');

-- Includes: users, messages, friends, cases, and documents tables
-- with RLS policies, automatic profile creation, and metadata syncing.
-- =====================================================================

-- 1) Required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- 2) USERS table: stores user profiles and roles
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_uid text unique, -- maps to auth.users.id
  email text unique,
  first_name text,
  last_name text,
  password_hash text,
  role text default 'user', -- 'user' | 'mckenzie' | 'admin'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_users_auth_uid on public.users(auth_uid);
create index if not exists idx_users_role on public.users(role);

-- 3) MESSAGES table: chat messages
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  role text, -- e.g. 'user' | 'mckenzie' | 'system'
  content text,
  attachments jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_messages_user_id on public.messages(user_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);

-- 4) Trigger helpers: keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql stable;

drop trigger if exists trg_set_updated_at_users on public.users;
create trigger trg_set_updated_at_users
  before update on public.users
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_set_updated_at_messages on public.messages;
create trigger trg_set_updated_at_messages
  before update on public.messages
  for each row execute procedure public.set_updated_at();

-- 5) Automatically create a minimal profile when a new auth user is created
create or replace function public.handle_auth_user_created()
returns trigger as $$
begin
  if not exists (select 1 from public.users u where u.auth_uid = new.id) then
    insert into public.users (auth_uid, email, created_at)
    values (new.id, new.email, now());
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_auth_user_created();

-- =====================================================================
-- PASSWORD RESET support: token storage for server-side password reset flow
-- Add a password_resets table to store one-time tokens issued by the server.
create table if not exists public.password_resets (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_password_resets_token on public.password_resets(token);
alter table public.password_resets enable row level security;

create policy "password_resets_insert_server" on public.password_resets
  for insert with check (true);

create policy "password_resets_select_server" on public.password_resets
  for select using (auth.role() = 'service_role');

create policy "password_resets_update_server" on public.password_resets
  for update using (auth.role() = 'service_role');

-- End password reset additions
-- =====================================================================
-- 6) ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- USERS table RLS
alter table public.users enable row level security;

create policy "users_select_own_or_mckenzie" on public.users
  for select using (
    (auth.role() = 'anon' and role = 'mckenzie')
    or auth.uid()::text = auth_uid
    or (auth.role() = 'authenticated' and role = 'mckenzie')
  );

create policy "users_insert_own" on public.users
  for insert with check (auth.uid()::text = auth_uid);

create policy "users_update_own" on public.users
  for update using (auth.uid()::text = auth_uid)
  with check (auth.uid()::text = auth_uid);

-- MESSAGES table RLS
alter table public.messages enable row level security;

create policy "messages_select_owner" on public.messages
  for select using (
    exists (select 1 from public.users u where u.id = public.messages.user_id and u.auth_uid = auth.uid()::text)
  );

create policy "messages_insert_owner" on public.messages
  for insert with check (
    exists (select 1 from public.users u where u.id = user_id and u.auth_uid = auth.uid()::text)
  );

create policy "messages_modify_owner_update" on public.messages
  for update using (
    exists (select 1 from public.users u where u.id = public.messages.user_id and u.auth_uid = auth.uid()::text)
  ) with check (
    exists (select 1 from public.users u where u.id = user_id and u.auth_uid = auth.uid()::text)
  );

create policy "messages_modify_owner_delete" on public.messages
  for delete using (
    exists (select 1 from public.users u where u.id = public.messages.user_id and u.auth_uid = auth.uid()::text)
  );

-- =====================================================================
-- FRIENDS table
-- =====================================================================
create table if not exists public.friends (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  friend_id uuid not null references public.users(id) on delete cascade,
  status text default 'pending',
  created_at timestamptz default now()
);

create index if not exists idx_friends_user on public.friends(user_id);
create index if not exists idx_friends_friend on public.friends(friend_id);

alter table public.friends enable row level security;

create policy "friends_select_owner" on public.friends
  for select using (
    exists (select 1 from public.users u where u.id = public.friends.user_id and u.auth_uid = auth.uid()::text)
    or exists (select 1 from public.users u where u.id = public.friends.friend_id and u.auth_uid = auth.uid()::text)
  );

create policy "friends_insert_owner" on public.friends
  for insert with check (
    exists (select 1 from public.users u where u.id = user_id and u.auth_uid = auth.uid()::text)
  );

create policy "friends_modify_owner_update" on public.friends
  for update using (
    exists (select 1 from public.users u where u.id = public.friends.user_id and u.auth_uid = auth.uid()::text)
  ) with check (
    exists (select 1 from public.users u where u.id = user_id and u.auth_uid = auth.uid()::text)
  );

create policy "friends_modify_owner_delete" on public.friends
  for delete using (
    exists (select 1 from public.users u where u.id = public.friends.user_id and u.auth_uid = auth.uid()::text)
  );

-- =====================================================================
-- CASES table
-- =====================================================================
create table if not exists public.cases (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'open',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cases_user on public.cases(user_id);
alter table public.cases enable row level security;

create policy "cases_select_owner" on public.cases
  for select using (
    exists (select 1 from public.users u where u.id = public.cases.user_id and u.auth_uid = auth.uid()::text)
  );

create policy "cases_insert_owner" on public.cases
  for insert with check (
    exists (select 1 from public.users u where u.id = user_id and u.auth_uid = auth.uid()::text)
  );

create policy "cases_modify_owner_update" on public.cases
  for update using (
    exists (select 1 from public.users u where u.id = public.cases.user_id and u.auth_uid = auth.uid()::text)
  ) with check (
    exists (select 1 from public.users u where u.id = user_id and u.auth_uid = auth.uid()::text)
  );

create policy "cases_modify_owner_delete" on public.cases
  for delete using (
    exists (select 1 from public.users u where u.id = public.cases.user_id and u.auth_uid = auth.uid()::text)
  );

-- =====================================================================
-- DOCUMENTS table
-- =====================================================================
create table if not exists public.documents (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  case_id bigint references public.cases(id) on delete set null,
  storage_path text not null,
  public_url text,
  filename text,
  mimetype text,
  size bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_documents_user on public.documents(user_id);
alter table public.documents enable row level security;

create policy "documents_select_owner" on public.documents
  for select using (
    exists (select 1 from public.users u where u.id = public.documents.user_id and u.auth_uid = auth.uid()::text)
  );

create policy "documents_insert_owner" on public.documents
  for insert with check (
    exists (select 1 from public.users u where u.id = user_id and u.auth_uid = auth.uid()::text)
  );

create policy "documents_modify_owner_update" on public.documents
  for update using (
    exists (select 1 from public.users u where u.id = public.documents.user_id and u.auth_uid = auth.uid()::text)
  ) with check (
    exists (select 1 from public.users u where u.id = user_id and u.auth_uid = auth.uid()::text)
  );

create policy "documents_modify_owner_delete" on public.documents
  for delete using (
    exists (select 1 from public.users u where u.id = public.documents.user_id and u.auth_uid = auth.uid()::text)
  );

-- =====================================================================
-- 7) Mirror auth metadata into public.users when an auth.user is created
-- =====================================================================
create or replace function public.mirror_auth_metadata()
returns trigger as $$
declare
  raw jsonb;
  fn text;
  ln text;
begin
  raw := coalesce(new.raw_user_meta_data, new.user_metadata);
  fn := null; ln := null;
  if raw is not null then
    fn := (raw ->> 'firstName');
    if fn is null then fn := (raw ->> 'first_name'); end if;
    ln := (raw ->> 'lastName');
    if ln is null then ln := (raw ->> 'last_name'); end if;
  end if;

  if not exists (select 1 from public.users u where u.auth_uid = new.id) then
    insert into public.users (auth_uid, email, first_name, last_name, created_at)
    values (new.id, new.email, fn, ln, now());
  else
    update public.users set
      first_name = coalesce(first_name, fn),
      last_name = coalesce(last_name, ln),
      updated_at = now()
    where auth_uid = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_mirror_auth_metadata on auth.users;
create trigger trg_mirror_auth_metadata
  after insert on auth.users
  for each row execute procedure public.mirror_auth_metadata();

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
