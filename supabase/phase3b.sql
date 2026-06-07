-- ============================================================
-- 곁에 — Phase 3 마이그레이션 ②: 활력징후 (혈압·혈당)
-- 이전 마이그레이션 실행 후 RUN. Idempotent.
-- ============================================================

create table if not exists public.vitals (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  kind text not null check (kind in ('bp','glucose')),
  systolic int,           -- 혈압 수축기
  diastolic int,          -- 혈압 이완기
  pulse int,              -- 맥박 (선택)
  value numeric,          -- 혈당 mg/dL
  tag text,               -- 공복 | 식후 등 (선택)
  measured_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists vitals_circle_kind on public.vitals (circle_id, kind, measured_at desc);

alter table public.vitals enable row level security;

drop policy if exists "members rw vitals" on public.vitals;
create policy "members rw vitals" on public.vitals
  for all using (public.is_circle_member(circle_id)) with check (public.is_circle_member(circle_id));
