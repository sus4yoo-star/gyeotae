# 곁에 (Gyeotae) — 가족 돌봄 웹앱

> 혼자 계셔도, 혼자가 아닙니다. — AMOV

만나(MANNA)·셀라(Selah)와 **똑같은 구조**로 만든 Next.js PWA(설치형 웹앱)입니다.
스마트폰 홈 화면에 추가하면 앱처럼 전체화면으로 열립니다.

---

## 1. 이게 무엇인가요

- **기술**: Next.js 15 + React 19 + Tailwind + PWA (만나/셀라와 동일 스택)
- **화면 구성**
  - `/` — 시작 화면 (브랜드 인트로)
  - `/home` — 부모님 화면 (SOS, 안부, 약, 손주 편지함, 엄마의 이야기, 추억, 오늘의 말씀)
  - `/family` — 자녀 화면 (온기 점수, 부모님 상태, 실시간 활동)
  - `/call` — AI 모닝콜 (Claude AI와 실제 대화 + 가족 요약)
- **시니어 배려**: 글자 크기 조절(하단 바), 큰 버튼, 따뜻한 색감
- **설치형 PWA**: 홈 화면 추가, 오프라인 셸, 앱 아이콘

---

## 2. 인터넷에 올리는 법 (배포)

만나·셀라를 올린 것과 **똑같습니다.**

### 방법 A — Netlify (만나·셀라와 동일, 추천)
1. 이 폴더 전체를 GitHub에 새 저장소로 올립니다.
2. [netlify.com](https://netlify.com) → "Add new site" → "Import an existing project" → 그 저장소 선택.
3. 빌드 설정은 자동 감지됩니다 (`netlify.toml` 포함). 그대로 "Deploy".
4. 끝! 몇 분 뒤 `https://(이름).netlify.app` 주소가 나옵니다.

### 방법 B — Vercel
1. GitHub에 올린 뒤 [vercel.com](https://vercel.com)에서 Import → Deploy. 설정 자동.

---

## 3. AI 모닝콜을 진짜로 작동시키려면 (선택)

기본 상태에서도 `/call`은 **시뮬레이션 대화**로 잘 작동합니다(데모용).
실제 Claude AI 대화로 바꾸려면 API 키 하나만 넣으면 됩니다:

1. [console.anthropic.com](https://console.anthropic.com)에서 API 키 발급
2. Netlify/Vercel 사이트 설정 → **Environment variables(환경 변수)**에 추가:
   - 이름: `ANTHROPIC_API_KEY`
   - 값: 발급받은 키 (`sk-ant-...`)
3. 다시 Deploy. 이제 `/call`이 진짜 AI와 대화합니다.

> 키는 서버(`/api/chat`)에만 저장되어 안전합니다. 앱 화면 코드에는 노출되지 않습니다.

---

## 4. 내 컴퓨터에서 미리 보기 (선택)

```bash
npm install
npm run dev
```
브라우저에서 http://localhost:3000 접속.

---

## 5. 다음에 진짜로 만들어야 할 것 (중요)

이 웹앱은 **화면·경험·AI 안부**를 진짜로 구현합니다. 다만 아래 "생명이 걸린"
기능은 별도의 서버·인증·푸시·휴대폰 권한이 필요해 아직 시뮬레이션입니다:

- 실제 가족 폰으로 가는 **SOS 푸시 알림** (web-push + 서버 + 가족 계정 연결)
- **무응답·낙상 감지** (휴대폰 센서·백그라운드 권한)
- 로그인·가족 연결·데이터 영구 저장 (Supabase 등 — 만나·셀라처럼)

이 부분은 동봉된 `gyeotae_launch_roadmap.pdf`의 4단계 로드맵을 따르세요.
지금 이 앱으로 베타 가족을 모으고, 검증한 뒤 위 기능을 붙이는 것이 가장 안전합니다.

---

## 폴더 구조
```
gyeotae-app/
├── src/app/
│   ├── page.tsx           시작 화면
│   ├── home/page.tsx      부모님 화면
│   ├── family/page.tsx    자녀 화면 (온기 점수)
│   ├── call/page.tsx      AI 모닝콜
│   ├── api/chat/route.ts  Claude API (서버)
│   ├── layout.tsx         PWA 설정·스플래시
│   └── globals.css        따뜻한 색 테마
├── src/components/        버튼·하단바·스플래시·설치안내
├── public/                아이콘·manifest·service worker
└── README.md              이 파일
```

Powered by AMOV · Love Moves Everything, Inspired by Prayer, Powered by Love
