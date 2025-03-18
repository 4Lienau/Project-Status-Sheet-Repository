-- Create pending_users table and add is_approved to profiles
create table if not exists public.pending_users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  department text,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default now() not null
);

alter table public.profiles add column if not exists is_approved boolean default null;

-- Set up RLS policies
alter table public.pending_users enable row level security;

create policy "Admins_manage_pending_users"
  on public.pending_users
  using (auth.jwt() ->> 'email' in ('4lienau@gmail.com', 'chrisl@re-wa.org'))
  with check (auth.jwt() ->> 'email' in ('4lienau@gmail.com', 'chrisl@re-wa.org'));

create policy "Users_read_own_pending_status"
  on public.pending_users for select
  using (auth.uid() = id);
