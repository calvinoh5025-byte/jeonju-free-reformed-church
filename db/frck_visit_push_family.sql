-- '내 가정 알림'을 위한 칸 추가. Supabase SQL Editor에서 한 번만 실행합니다. (여러 번 실행해도 안전)
-- 알림을 신청한 기기가 고른 심방 대상자 번호만 저장합니다. 비어 있으면 기존처럼 심방 종류별로 받습니다.
alter table public.frck_visit_push_subscriptions
  add column if not exists target_ids bigint[] not null default '{}' check (cardinality(target_ids) <= 10);

notify pgrst, 'reload schema';
