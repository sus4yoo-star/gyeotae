-- ============================================================
-- 곁에 — 버그 점검 후 패치 (이미 마이그레이션을 돌린 기존 설치용)
-- SQL Editor에 붙여넣고 RUN. 한 번만. Idempotent.
-- ============================================================

-- 1) 받은 음성 실시간 (phase1에서 누락됐던 경우)
do $$ begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='voice_messages') then
    alter publication supabase_realtime add table public.voice_messages;
  end if;
end $$;

-- 2) 무응답 감지: 부모님 신호만 활동으로 인정 (자녀의 사진/음성 공유로 안 풀리게)
drop trigger if exists on_event_bump on public.care_events;
create trigger on_event_bump after insert on public.care_events
  for each row when (NEW.type in ('med','meal','sos','checkin','memoir'))
  execute function public.bump_activity();

-- 3) 푸시 중복 구독 정리 + endpoint 유니크 (알림 여러 번 방지)
alter table public.push_subscriptions add column if not exists endpoint text;
update public.push_subscriptions set endpoint = subscription->>'endpoint' where endpoint is null;
-- 같은 (user, endpoint) 중복 행 정리 (최신 1개만 유지)
delete from public.push_subscriptions a
  using public.push_subscriptions b
  where a.endpoint is not null and a.user_id = b.user_id and a.endpoint = b.endpoint and a.ctid < b.ctid;
create unique index if not exists push_sub_user_endpoint
  on public.push_subscriptions (user_id, endpoint);

-- 4) 앨범 항목 삭제 정책 (대칭성)
drop policy if exists "own media delete" on public.media_items;
create policy "own media delete" on public.media_items for delete
  using (uploader = auth.uid());
