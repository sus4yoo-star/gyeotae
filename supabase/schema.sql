-- ============================================================
-- 곁에 (Gyeotae) — Supabase 데이터베이스 스키마
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 RUN 하세요.
-- ============================================================

-- 1) 프로필 (가입한 사용자 = 자녀/가족)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz default now()
);

-- 2) 돌봄 모임 (부모님 한 분 = 한 모임)
create table if not exists public.care_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리 가족',
  parent_name text not null,
  parent_age int,
  parent_location text,
  invite_code text not null unique default substr(md5(random()::text), 1, 6),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- 3) 모임 구성원 (자녀·형제자매)
create table if not exists public.circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  relation text default '가족',
  role text default 'member',           -- 'admin' | 'member'
  display_name text,
  created_at timestamptz default now(),
  unique (circle_id, user_id)
);

-- 4) 활동/이벤트 (SOS, 복약, 안부, 무응답, 이야기 등)
create table if not exists public.care_events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  type text not null,                    -- sos|med|checkin|silence|memoir|message|video
  message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 5) 푸시 구독 (web-push)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  circle_id uuid references public.care_circles(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- 6) 복약 기록 (부모님↔자녀 기기 간 동기화용, 날짜·복용시간대별 1행)
create table if not exists public.med_logs (
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  log_date date not null,
  dose text not null,                    -- morning|lunch|evening
  taken_at text,                         -- "HH:MM" (복용함) 또는 null (미복용)
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now(),
  primary key (circle_id, log_date, dose)
);

-- ============================================================
-- 헬퍼: 현재 사용자가 특정 모임의 구성원인지
-- ============================================================
create or replace function public.is_circle_member(cid uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.circle_members m
    where m.circle_id = cid and m.user_id = auth.uid()
  );
$$;

-- 헬퍼: 현재 사용자가 특정 모임의 관리자(admin)이거나 모임 소유자인지
create or replace function public.is_circle_admin(cid uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.circle_members m
    where m.circle_id = cid and m.user_id = auth.uid() and m.role = 'admin'
  ) or exists(
    select 1 from public.care_circles c
    where c.id = cid and c.owner_id = auth.uid()
  );
$$;

-- ============================================================
-- 초대코드로 모임 합류 (비구성원은 RLS로 모임을 읽을 수 없으므로
-- security definer 함수로 조회+가입을 안전하게 처리)
-- ============================================================
create or replace function public.join_circle(p_code text, p_display_name text default null)
returns uuid language plpgsql security definer as $$
declare cid uuid;
begin
  if auth.uid() is null then return null; end if;
  select id into cid from public.care_circles
    where lower(invite_code) = lower(p_code) limit 1;
  if cid is null then return null; end if;
  insert into public.circle_members (circle_id, user_id, relation, role, display_name)
  values (cid, auth.uid(), '가족', 'member', nullif(p_display_name, ''))
  on conflict (circle_id, user_id) do nothing;
  return cid;
end; $$;
revoke all on function public.join_circle(text, text) from public, anon;
grant execute on function public.join_circle(text, text) to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.care_circles      enable row level security;
alter table public.circle_members    enable row level security;
alter table public.care_events       enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.med_logs          enable row level security;

-- profiles: 본인만
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- care_circles: 구성원이면 읽기, 본인이 만든 것만 수정
drop policy if exists "members read circle" on public.care_circles;
create policy "members read circle" on public.care_circles
  for select using (public.is_circle_member(id) or owner_id = auth.uid());
drop policy if exists "owner writes circle" on public.care_circles;
create policy "owner writes circle" on public.care_circles
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- circle_members: 같은 모임 구성원끼리 보기, 본인 행은 본인이 추가
drop policy if exists "members read members" on public.circle_members;
create policy "members read members" on public.circle_members
  for select using (public.is_circle_member(circle_id));
drop policy if exists "self join" on public.circle_members;
create policy "self join" on public.circle_members
  for insert with check (user_id = auth.uid());
drop policy if exists "self leave" on public.circle_members;
create policy "self leave" on public.circle_members
  for delete using (user_id = auth.uid());
-- 관리자는 같은 모임 구성원의 역할 변경/내보내기 가능
drop policy if exists "admin updates members" on public.circle_members;
create policy "admin updates members" on public.circle_members
  for update using (public.is_circle_admin(circle_id)) with check (public.is_circle_admin(circle_id));
drop policy if exists "admin removes members" on public.circle_members;
create policy "admin removes members" on public.circle_members
  for delete using (public.is_circle_admin(circle_id));

-- care_events: 모임 구성원이면 읽고 쓰기
drop policy if exists "members read events" on public.care_events;
create policy "members read events" on public.care_events
  for select using (public.is_circle_member(circle_id));
drop policy if exists "members write events" on public.care_events;
create policy "members write events" on public.care_events
  for insert with check (public.is_circle_member(circle_id));

-- push_subscriptions: 본인 것만
drop policy if exists "own push" on public.push_subscriptions;
create policy "own push" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- med_logs: 모임 구성원이면 읽고 쓰기 (부모님↔자녀 동기화)
drop policy if exists "members read meds" on public.med_logs;
create policy "members read meds" on public.med_logs
  for select using (public.is_circle_member(circle_id));
drop policy if exists "members write meds" on public.med_logs;
create policy "members write meds" on public.med_logs
  for all using (public.is_circle_member(circle_id)) with check (public.is_circle_member(circle_id));

-- ============================================================
-- 가입 시 프로필 자동 생성
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 실시간 활성화 (자녀 화면이 이벤트를 실시간 수신)
alter publication supabase_realtime add table public.care_events;
