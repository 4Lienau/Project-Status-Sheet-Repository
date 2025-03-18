-- Add policy to allow users to insert their own records during signup
create policy "Users_insert_own_pending_status"
  on public.pending_users for insert
  with check (auth.uid() = id);
