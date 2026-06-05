# 곁에 — 설치 · 배포 · 에러 해결 가이드

비개발자도 따라올 수 있게 순서대로 적었어요. 만나·셀라를 배포한 경험이 있으면 더 쉽습니다.

---

## 0. 한눈에 보기

곁에는 **3가지를 연결하면 100% 작동**합니다. 아무것도 연결 안 해도 "둘러보기(데모) 모드"로 잘 돌아가요.

| 연결 | 무엇이 켜지나 | 필수? |
|---|---|---|
| Supabase | 로그인 (구글·카카오·이메일), 가족 연결, 데이터 저장 | 권장 |
| VAPID 키 | 실제 SOS 푸시 알림 (가족 폰으로) | 권장 |
| Anthropic 키 | AI 모닝콜 실제 대화 | 선택 |

---

## 1. Supabase 연결 (로그인 + 가족 + 데이터)

### 1-A. 프로젝트 만들고 스키마 실행
1. [supabase.com](https://supabase.com) → **New project** → 프로젝트 이름 `gyeotae` (비밀번호 메모).
2. 왼쪽 **SQL Editor → New query** → 이 프로젝트 `supabase/schema.sql` 내용을 **전부 복사·붙여넣고 RUN**.
   - "Success. No rows returned" 이 나오면 성공이에요.
3. 왼쪽 **Project Settings → API** 에서 두 값 메모:
   - `Project URL` → 환경변수 `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (⚠️ `service_role` 키는 절대 복사하지 마세요)

### 1-B. URL Configuration (로그인 후 어디로 돌려보낼지)
1. **Authentication → URL Configuration → Redirect URLs** 에 추가:
   ```
   http://localhost:3000/auth/callback
   https://(내앱).netlify.app/auth/callback
   https://gyeotae.theamov.com/auth/callback   ← 커스텀 도메인이 있다면
   ```

### 1-C. 이메일 로그인 (기본 켜져 있음)
`Authentication → Sign In / Providers → Email` 이 **이미 Enabled** 상태일 거예요. 그대로 두시면 됩니다.

### 1-D. 구글 로그인 켜기 🔵
만나·셀라와 동일한 방식이에요.

1. **[Google Cloud Console](https://console.cloud.google.com)** 접속 → 프로젝트 새로 만들기 (또는 셀라/만나용 프로젝트 그대로 재사용 가능 — 새 OAuth Client만 추가하면 돼요).
2. 왼쪽 메뉴 **APIs & Services → OAuth consent screen**:
   - User Type: **External**
   - 앱 이름: `곁에 (Gyeotae)`
   - 사용자 지원 이메일: 본인 이메일
   - 저장.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `Gyeotae Supabase`
   - **Authorized redirect URIs** 에 한 줄 추가 (Supabase가 정해준 주소):
     ```
     https://(내-supabase-프로젝트-id).supabase.co/auth/v1/callback
     ```
     (Supabase 프로젝트 → Authentication → Providers → Google 패널에서 정확한 주소를 보여줘요)
   - Create → 나오는 **Client ID**, **Client secret** 복사.
4. Supabase로 돌아와 **Authentication → Sign In / Providers → Google**:
   - Enabled 토글 켜기
   - Client ID, Client Secret 붙여넣기
   - Save

### 1-E. 카카오 로그인 켜기 🟡
1. **[카카오 디벨로퍼스](https://developers.kakao.com)** → 내 애플리케이션 → **애플리케이션 추가하기**:
   - 앱 이름: `곁에`
   - 사업자명: AMOV
2. 만든 앱 → **앱 키** 탭에서 **REST API 키** 복사 (이게 Supabase의 Client ID로 들어감).
3. **플랫폼 → Web 플랫폼 등록**:
   - 사이트 도메인: `https://(내-supabase-프로젝트-id).supabase.co`
   - (배포 후 `https://gyeotae.theamov.com` 도 추가)
4. **카카오 로그인 → 활성화 설정 ON**.
5. **카카오 로그인 → Redirect URI 등록**:
   ```
   https://(내-supabase-프로젝트-id).supabase.co/auth/v1/callback
   ```
6. **카카오 로그인 → 동의 항목**:
   - 닉네임: **필수 동의**
   - 카카오계정(이메일): **선택 동의** (또는 필수 — 권장)
7. **보안 → Client Secret → 코드 생성**:
   - "사용함"으로 활성화 후 시크릿 복사.
8. Supabase로 돌아와 **Authentication → Sign In / Providers → Kakao**:
   - Enabled 토글 켜기
   - **Client ID**: 2번에서 복사한 **REST API 키**
   - **Client Secret**: 7번에서 만든 시크릿
   - Save

---

## 2. 푸시 알림(VAPID) 연결 — 실제 SOS 알림

`.env.example` 안에 **이미 생성된 키 한 쌍**이 들어있어요. 그대로 Netlify 환경변수에 넣으면 됩니다:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOconjBLfPr-aPPiA4skJ_-f0FfoQaTVLRRmLf9wTzvSmvSb1IVRGOHpcboin-Ck3UrDOG5OAmObLLwLX21EK6s
VAPID_PRIVATE_KEY=yIMK10PSIQquWFdYjwqt--804EGl-khJVftyG7ZQZs0
VAPID_SUBJECT=mailto:hello@amov.app
```

> 새 키를 만들고 싶으면 터미널에서 `npm run gen:vapid` 실행 → 나온 두 줄을 넣으세요.

> **중요 — 가족 전체 알림을 켜려면 `SUPABASE_SERVICE_ROLE_KEY`도 넣어주세요.**
> SOS는 가족 *모두*의 푸시 구독을 읽어야 하는데, 일반 `anon` 키는 RLS 때문에
> 본인 구독만 보입니다. Supabase 대시보드 → Settings → API → `service_role` 키를
> **서버 환경변수**(`SUPABASE_SERVICE_ROLE_KEY`)에 넣으세요. 이 키는 절대
> `NEXT_PUBLIC_` 접두사를 붙이거나 브라우저에 노출하면 안 됩니다. 넣지 않으면
> SOS 푸시는 누른 사람 본인 기기에만 갑니다.

작동 방식: 가족이 자녀 화면 우측 상단 **"알림 켜기"** → 부모님이 SOS 누르면 가족 모두에게 푸시.

---

## 3. AI 모닝콜 (선택)

[console.anthropic.com](https://console.anthropic.com) 키 발급 → `ANTHROPIC_API_KEY`에 넣기. 없어도 `/call`은 시뮬레이션으로 작동.

---

## 4. 배포하기 (Netlify, 만나·셀라와 동일)

1. 이 폴더를 GitHub 새 저장소로 올림.
2. [netlify.com](https://netlify.com) → Add new site → Import → 저장소 선택 → Deploy.
3. **Site configuration → Environment variables** 에 모두 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
   - `SUPABASE_SERVICE_ROLE_KEY` (가족 전체 SOS 알림에 필요)
   - `ANTHROPIC_API_KEY` (선택)
4. **Deploys → Trigger deploy** 한 번 더 (환경변수는 재배포해야 적용).
5. 1-B 의 Redirect URLs 와 카카오 Redirect URI 에 **최종 도메인을 빠짐없이** 추가했는지 확인.

> Vercel도 동일: Import → Environment Variables → Deploy.

---

## 5. 에러가 나면

**구글/카카오 버튼 눌렀더니 "redirect_uri_mismatch"**
→ Google Cloud의 Authorized redirect URI 또는 카카오의 Redirect URI에 등록한 주소가 Supabase가 요구하는 정확한 주소와 한 글자라도 다른 경우. 반드시 `https://(supabase-project).supabase.co/auth/v1/callback` 그대로 — `/auth/v1/callback` 부분이 핵심.

**카카오 로그인 → "동의 항목 필수" 에러**
→ 카카오 디벨로퍼스 → 카카오 로그인 → 동의 항목에서 닉네임을 "필수 동의"로 바꿔주세요.

**구글 로그인 → "앱이 확인되지 않음" 경고**
→ 정상이에요. 개발 단계에선 OAuth consent screen이 "Testing" 상태라 그래요. "고급 → 이동(안전하지 않음)" 으로 진행하면 작동. 정식 출시 전 Google에 검수 신청하면 사라집니다.

**`Module not found: Can't resolve '@/...'`**
→ `src/` 구조를 옮기면 발생. 그대로 두세요.

**`supabaseUrl is required`**
→ 환경변수 이름 오타. 정확히 `NEXT_PUBLIC_SUPABASE_URL` (NEXT_PUBLIC_ 접두사 필수).

**로그인 후 곧바로 다시 로그인 화면이 나옴 (무한 루프)**
→ Supabase의 Redirect URLs에 현재 도메인의 `/auth/callback` 이 없는 경우. 1-B 확인.

**"알림 켜기" 눌러도 알림이 안 옴**
→ ① VAPID 환경변수 3개 다 넣었는지 ② 가족이 각자 폰에서 알림 권한을 허용했는지 ③ iOS는 **홈 화면에 추가한 PWA 상태**에서만 푸시가 됩니다.

**`web-push` 관련 런타임 에러**
→ 푸시 전송 라우트는 Node 런타임이어야 함. `export const runtime = "edge"` 를 푸시 라우트에 넣지 마세요.

**빌드는 되는데 폰트/화면이 이상**
→ 폰에서 기존 PWA 삭제 후 재설치하면 해결돼요 (서비스워커 캐시).

---

## 6. 아직 시뮬레이션인 것 (정직하게)

- **무응답·낙상 자동 감지**: 휴대폰 백그라운드 센서 권한이 필요해 웹앱만으론 한계. 추후 네이티브 래핑(Capacitor) 또는 별도 기기 연동 필요.
- 그 외 SOS 푸시·구글·카카오·이메일 로그인·가족 연결·데이터 저장·AI 안부는 위 설정을 마치면 **실제로 작동**합니다.

문제가 생기면 배포 로그 또는 화면을 그대로 보내주세요. 바로 잡아드릴게요.
