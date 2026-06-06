-- ============================================================
-- 곁에 (Gyeotae) — Phase 2 "소통" 마이그레이션 ①: 가족 채팅
-- schema.sql + phase1.sql 실행 후, 이 파일을 SQL Editor에 붙여넣고 RUN.
-- 재실행해도 안전(idempotent).
-- ============================================================

-- 채널: 모임당 '온 가족'(family) + '자녀끼리 백스테이지'(caregivers)
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  type text not null,                       -- family | caregivers
  created_at timestamptz default now(),
  unique (circle_id, type)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  author uuid references auth.users(id) on delete set null,
  body text,
  kind text default 'text',                 -- text | voice (추후)
  created_at timestamptz default now(),
  recalled_at timestamptz
);
create index if not exists messages_channel on public.messages (channel_id, created_at);

-- 채널 가져오기/없으면 생성 (구성원만)
create or replace function public.get_or_create_channels(p_circle uuid)
returns table(id uuid, type text) language plpgsql security definer as $$
begin
  if not public.is_circle_member(p_circle) then return; end if;
  insert into public.channels(circle_id, type) values (p_circle, 'family')     on conflict (circle_id, type) do nothing;
  insert into public.channels(circle_id, type) values (p_circle, 'caregivers') on conflict (circle_id, type) do nothing;
  return query select c.id, c.type from public.channels c where c.circle_id = p_circle and c.type in ('family','caregivers');
end $$;
revoke all on function public.get_or_create_channels(uuid) from public, anon;
grant execute on function public.get_or_create_channels(uuid) to authenticated;

-- RLS
alter table public.channels enable row level security;
alter table public.messages enable row level security;

drop policy if exists "members read channels" on public.channels;
create policy "members read channels" on public.channels
  for select using (public.is_circle_member(circle_id));
drop policy if exists "members insert channels" on public.channels;
create policy "members insert channels" on public.channels
  for insert with check (public.is_circle_member(circle_id));

drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages
  for select using (public.is_circle_member(circle_id));
drop policy if exists "members write messages" on public.messages;
create policy "members write messages" on public.messages
  for insert with check (public.is_circle_member(circle_id) and author = auth.uid());
drop policy if exists "author updates messages" on public.messages;
create policy "author updates messages" on public.messages
  for update using (author = auth.uid()) with check (author = auth.uid());

-- 실시간
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
