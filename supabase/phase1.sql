-- ============================================================
-- 곁에 (Gyeotae) — Phase 1 "안심의 완성" 마이그레이션
-- schema.sql 을 먼저 실행한 뒤, 이 파일 전체를 SQL Editor에 붙여넣고 RUN.
-- 재실행해도 안전(idempotent)하게 작성했습니다.
-- ============================================================

-- ── 2. 응급 의료카드 ─────────────────────────────────────────
create table if not exists public.medical_profiles (
  circle_id uuid primary key references public.care_circles(id) on delete cascade,
  sex text,
  blood_type text,
  conditions text,
  allergies text,
  medications text,
  surgeries text,
  history text,
  height_cm int,
  weight_kg int,
  doctor text,
  hospital text,
  insurance text,
  emergency_contacts jsonb default '[]'::jsonb,   -- [{name, relation, phone}]
  dnr boolean default false,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

-- 한 모임당 하나의 공개 응급 링크(토큰)
create table if not exists public.emergency_links (
  token text primary key default encode(gen_random_bytes(9), 'hex'),
  circle_id uuid not null unique references public.care_circles(id) on delete cascade,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- ── 3. SOS 알림(상태 있는 사건) ──────────────────────────────
create table if not exists public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  triggered_by uuid references auth.users(id) on delete set null,
  status text not null default 'active',        -- active | acknowledged | resolved
  lat double precision,
  lng double precision,
  location_text text,
  ack_by uuid references auth.users(id) on delete set null,
  ack_at timestamptz,
  escalated_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists sos_alerts_circle_active on public.sos_alerts (circle_id, status);

-- ── 5. 음성 메시지 ───────────────────────────────────────────
create table if not exists public.voice_messages (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  author uuid references auth.users(id) on delete set null,
  storage_path text not null,
  duration_sec int,
  created_at timestamptz default now()
);
create index if not exists voice_messages_circle on public.voice_messages (circle_id, created_at desc);

-- ── 4. 무응답 감지용 컬럼 ────────────────────────────────────
alter table public.care_circles add column if not exists last_activity_at timestamptz default now();
alter table public.care_circles add column if not exists silence_threshold_hours int default 12;
alter table public.care_circles add column if not exists quiet_start time default '21:00';
alter table public.care_circles add column if not exists quiet_end time default '07:00';
alter table public.care_circles add column if not exists last_silence_alert_date date;

-- 부모측 활동(이벤트/복약)이 생기면 last_activity_at 자동 갱신
create or replace function public.bump_activity() returns trigger
language plpgsql security definer as $$
begin
  update public.care_circles set last_activity_at = now() where id = NEW.circle_id;
  return NEW;
end $$;

drop trigger if exists on_event_bump on public.care_events;
create trigger on_event_bump after insert on public.care_events
  for each row execute function public.bump_activity();

drop trigger if exists on_med_bump on public.med_logs;
create trigger on_med_bump after insert or update on public.med_logs
  for each row execute function public.bump_activity();

-- ============================================================
-- 익명 응급뷰: RLS로 테이블을 열지 않고, 토큰 RPC로 "필요한 필드만"
-- ============================================================
create or replace function public.get_emergency_card(p_token text)
returns jsonb language sql security definer stable as $$
  select case when el.enabled then jsonb_build_object(
    'parent_name', c.parent_name,
    'parent_age',  c.parent_age,
    'sex',         m.sex,
    'blood_type',  m.blood_type,
    'allergies',   m.allergies,
    'conditions',  m.conditions,
    'medications', m.medications,
    'dnr',         coalesce(m.dnr, false),
    'doctor',      m.doctor,
    'hospital',    m.hospital,
    'emergency_contacts', coalesce(m.emergency_contacts, '[]'::jsonb)
  ) else null end
  from public.emergency_links el
  join public.care_circles c on c.id = el.circle_id
  left join public.medical_profiles m on m.circle_id = el.circle_id
  where el.token = p_token
  limit 1;
$$;
revoke all on function public.get_emergency_card(text) from public;
grant execute on function public.get_emergency_card(text) to anon, authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.medical_profiles enable row level security;
alter table public.emergency_links  enable row level security;
alter table public.sos_alerts       enable row level security;
alter table public.voice_messages   enable row level security;

-- medical_profiles: 가족 구성원이면 읽고 쓰기
drop policy if exists "members rw medical" on public.medical_profiles;
create policy "members rw medical" on public.medical_profiles
  for all using (public.is_circle_member(circle_id)) with check (public.is_circle_member(circle_id));

-- emergency_links: 가족 구성원이면 읽고 쓰기 (토큰 생성/토글)
drop policy if exists "members rw emlinks" on public.emergency_links;
create policy "members rw emlinks" on public.emergency_links
  for all using (public.is_circle_member(circle_id)) with check (public.is_circle_member(circle_id));

-- sos_alerts: 가족이면 읽기/생성/갱신(확인·해결)
drop policy if exists "members read sos" on public.sos_alerts;
create policy "members read sos" on public.sos_alerts
  for select using (public.is_circle_member(circle_id));
drop policy if exists "members write sos" on public.sos_alerts;
create policy "members write sos" on public.sos_alerts
  for insert with check (public.is_circle_member(circle_id));
drop policy if exists "members update sos" on public.sos_alerts;
create policy "members update sos" on public.sos_alerts
  for update using (public.is_circle_member(circle_id)) with check (public.is_circle_member(circle_id));

-- voice_messages: 가족이면 읽고 쓰기
drop policy if exists "members rw voice" on public.voice_messages;
create policy "members rw voice" on public.voice_messages
  for all using (public.is_circle_member(circle_id)) with check (public.is_circle_member(circle_id));

-- 실시간: SOS 상태 변화를 가족 화면이 즉시 수신
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='sos_alerts') then
    alter publication supabase_realtime add table public.sos_alerts;
  end if;
end $$;

-- ============================================================
-- Storage: 비공개 음성 버킷 + 같은 모임 구성원만 접근
-- (경로 규칙: {circle_id}/{uuid}.webm)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('voice', 'voice', false)
on conflict (id) do nothing;

drop policy if exists "voice read" on storage.objects;
create policy "voice read" on storage.objects for select to authenticated
  using (bucket_id = 'voice' and public.is_circle_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "voice write" on storage.objects;
create policy "voice write" on storage.objects for insert to authenticated
  with check (bucket_id = 'voice' and public.is_circle_member(((storage.foldername(name))[1])::uuid));

-- ============================================================
-- 스케줄러(cron): 30분마다 보호된 API를 호출 → 무응답/에스컬레이션 점검
-- ⚠️ 아래 <CRON_SECRET> 을 환경변수와 동일한 값으로 바꿔서 실행하세요.
--    pg_cron / pg_net 확장은 Supabase Dashboard → Database → Extensions 에서 켭니다.
-- ============================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('gyeotae-tick') where exists (select 1 from cron.job where jobname='gyeotae-tick');
select cron.schedule('gyeotae-tick', '*/30 * * * *', $$
  select net.http_post(
    url     := 'https://gyeotae.theamov.com/api/cron/tick',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>')
  );
$$);
