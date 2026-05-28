# 곁에 — 설치 · 배포 · 에러 해결 가이드

비개발자도 따라올 수 있게 순서대로 적었어요. 만나·셀라를 배포한 경험이 있으면 더 쉽습니다.

---

## 0. 한눈에 보기

곁에는 **3가지를 연결하면 100% 작동**합니다. 아무것도 연결 안 해도 "둘러보기(데모) 모드"로 잘 돌아가요.

| 연결 | 무엇이 켜지나 | 필수? |
|---|---|---|
| Supabase | 로그인, 가족 연결, 데이터 저장, 실시간 활동 | 권장 |
| VAPID 키 | 실제 SOS 푸시 알림 (가족 폰으로) | 권장 |
| Anthropic 키 | AI 모닝콜 실제 대화 | 선택 |

---

## 1. Supabase 연결 (로그인 + 가족 + 데이터)

1. [supabase.com](https://supabase.com) 가입 → **New project** 생성 (비밀번호 메모).
2. 왼쪽 메뉴 **SQL Editor** → **New query** → 이 프로젝트의 `supabase/schema.sql` 파일 내용을 **전부 복사해 붙여넣고 RUN**.
   - "Success. No rows returned" 이 나오면 성공이에요.
3. 왼쪽 **Settings → API** 에서 두 값을 복사:
   - `Project URL` → 환경변수 `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → 환경변수 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Authentication → Providers → Email** 켜기. (매직링크 로그인이라 비밀번호 필요 없음)
5. **Authentication → URL Configuration → Redirect URLs** 에 배포 주소 추가:
   - `https://(내앱).netlify.app/auth/callback`

---

## 2. 푸시 알림(VAPID) 연결 — 실제 SOS 알림

`.env.example` 안에 **이미 생성된 키 한 쌍**이 들어있어요. 그대로 환경변수에 넣으면 됩니다:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...(.env.example 참고)
VAPID_PRIVATE_KEY=...(.env.example 참고)
VAPID_SUBJECT=mailto:hello@amov.app
```

> 새 키를 만들고 싶으면 터미널에서 `npm run gen:vapid` 실행 → 나온 두 줄을 넣으세요.

작동 방식: 가족이 자녀 화면 우측 상단 **"알림 켜기"**를 누르면 그 폰이 구독됩니다.
부모님이 SOS를 누르면 → 서버가 그 가족 모두에게 푸시를 쏩니다.

---

## 3. AI 모닝콜 (선택)

[console.anthropic.com](https://console.anthropic.com)에서 키 발급 → 환경변수 `ANTHROPIC_API_KEY`에 넣기.
없어도 `/call`은 시뮬레이션으로 잘 작동합니다.

---

## 4. 배포하기 (Netlify, 만나와 동일)

1. 이 폴더 전체를 GitHub 새 저장소에 올림.
2. [netlify.com](https://netlify.com) → Add new site → Import an existing project → 저장소 선택.
3. **Site settings → Environment variables** 에 위 1~3의 환경변수를 모두 추가.
4. **Deploy**. 끝나면 `https://(이름).netlify.app` 완성.
5. 1-5번의 Redirect URL에 이 최종 주소를 꼭 넣어주세요.

> Vercel도 동일: Import → Environment Variables 추가 → Deploy.

---

## 5. 에러가 나면 (자주 나오는 것부터)

배포 로그(Netlify의 "Deploy log")에서 빨간 글씨를 찾아 아래와 대조하세요. 안 풀리면 그 로그를 저에게 그대로 붙여주세요.

**`Module not found: Can't resolve '@/...'`**
→ `tsconfig.json`의 `paths`가 빠진 경우. 이 프로젝트엔 이미 들어있으니, 보통 폴더 구조를 옮기면 발생. `src/` 구조를 그대로 두세요.

**`supabaseUrl is required` 또는 Supabase 관련 빌드 에러**
→ 환경변수 이름 오타. 정확히 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 여야 함 (NEXT_PUBLIC_ 접두사 필수).

**로그인 메일은 오는데 클릭하면 에러**
→ Supabase Redirect URLs에 `/auth/callback` 주소를 안 넣었거나 주소가 다름. 1-5번 확인.

**"알림 켜기"를 눌러도 알림이 안 옴**
→ ① VAPID 환경변수 3개 다 넣었는지 ② 가족이 각자 폰에서 "알림 켜기"를 눌러 권한을 허용했는지 ③ iOS는 반드시 홈 화면에 추가한 PWA 상태에서만 푸시가 됩니다(사파리 탭에서는 안 됨).

**`web-push` 또는 `crypto` 관련 런타임 에러**
→ 푸시 전송 라우트는 Node 런타임이어야 함. 이 프로젝트는 그렇게 설정돼 있어요. 혹시 `export const runtime = "edge"`를 푸시 라우트에 넣지 마세요.

**빌드는 되는데 화면이 깨짐 / 폰트가 이상**
→ 보통 캐시 문제. 배포 후 폰에서 기존 PWA를 삭제하고 다시 설치하면 해결됩니다.

**Netlify 빌드 실패 — Next.js plugin**
→ `netlify.toml`이 루트에 있는지 확인. 있으면 자동으로 `@netlify/plugin-nextjs`가 적용됩니다.

---

## 6. 아직 시뮬레이션인 것 (정직하게)

- 무응답·낙상 **자동 감지**: 휴대폰 백그라운드 센서 권한이 필요해 웹앱만으론 한계가 있어요. 추후 네이티브 래핑(Capacitor 등) 또는 별도 기기 연동이 필요합니다.
- 그 외 SOS 푸시·로그인·가족 연결·데이터 저장·AI 안부는 위 설정을 마치면 **실제로 작동**합니다.

문제가 생기면 배포 로그를 그대로 보내주세요. 바로 잡아드릴게요.
