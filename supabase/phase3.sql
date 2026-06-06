-- ============================================================
-- 곁에 — Phase 3 마이그레이션 ①: 기념일·제사·생신
-- 이전 마이그레이션 실행 후 RUN. Idempotent.
-- ============================================================

create table if not exists public.occasions (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  title text not null,
  type text not null default 'anniversary',   -- birthday | memorial | anniversary | other
  month int not null check (month between 1 and 12),
  day int not null check (day between 1 and 31),
  is_lunar boolean default false,
  notify_days_before int default 3,
  last_notified_year int,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists occasions_circle on public.occasions (circle_id);

alter table public.occasions enable row level security;

drop policy if exists "members rw occasions" on public.occasions;
create policy "members rw occasions" on public.occasions
  for all using (public.is_circle_member(circle_id)) with check (public.is_circle_member(circle_id));
