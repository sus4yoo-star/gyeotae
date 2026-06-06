-- ============================================================
-- 곁에 — Phase 2 마이그레이션 ②: 사진·영상 앨범 (선택 공개)
-- schema.sql + phase1.sql + phase2.sql 실행 후 RUN. Idempotent.
-- ============================================================

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  uploader uuid references auth.users(id) on delete set null,
  storage_path text not null,
  kind text not null,                          -- image | video
  visibility text not null default 'family',   -- family | caregivers | private
  caption text,
  created_at timestamptz default now(),
  taken_down_at timestamptz
);
create index if not exists media_circle on public.media_items (circle_id, created_at desc);

alter table public.media_items enable row level security;

-- 읽기: 회수 안 됐고, (온가족/자녀끼리 → 구성원) 또는 (나만보기 → 올린 사람)
drop policy if exists "see media" on public.media_items;
create policy "see media" on public.media_items for select using (
  taken_down_at is null and (
    (visibility in ('family','caregivers') and public.is_circle_member(circle_id))
    or (visibility = 'private' and uploader = auth.uid())
  )
);
-- 올리기: 구성원이 본인 명의로
drop policy if exists "add media" on public.media_items;
create policy "add media" on public.media_items for insert
  with check (public.is_circle_member(circle_id) and uploader = auth.uid());
-- 수정/회수/공개범위 변경: 올린 사람만
drop policy if exists "own media" on public.media_items;
create policy "own media" on public.media_items for update
  using (uploader = auth.uid()) with check (uploader = auth.uid());

-- 실시간
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='media_items') then
    alter publication supabase_realtime add table public.media_items;
  end if;
end $$;

-- Storage: 비공개 'media' 버킷 (경로 {circle_id}/{uuid}.ext)
insert into storage.buckets (id, name, public) values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists "media read" on storage.objects;
create policy "media read" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_circle_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "media write" on storage.objects;
create policy "media write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_circle_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "media remove" on storage.objects;
create policy "media remove" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_circle_member(((storage.foldername(name))[1])::uuid));
