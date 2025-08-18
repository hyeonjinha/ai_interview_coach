### 008: 프론트엔드(UI) 및 docker-compose 멀티 서비스

**핵심**
- Next.js(앱 라우터) 기반 프론트 스캐폴딩 및 최소 UI 구현
- API 연동: 경험 등록 → 공고 등록 → 추천 → 인터뷰 시작/응답 → 피드백 조회
- CORS 허용(origin 설정), 멀티 서비스(docker-compose)로 웹/백 동시 구동

**포함/변경 파일**
- 백엔드
  - `app/main.py`: `CORSMiddleware` 추가, `FRONTEND_ORIGIN` 지원
  - `app/core/config.py`: `frontend_origin` 설정 추가
  - `.env.example`: `FRONTEND_ORIGIN=http://localhost:3000`
- 프론트엔드(`frontend/`)
  - `Dockerfile`: 멀티 스테이지 빌드(install → build → run)
  - `package.json`: Next 14 + React 18 + axios + swr, `dev/build/start` 스크립트
  - `next.config.js`: `NEXT_PUBLIC_API_BASE` 주입
  - `src/app/layout.tsx`, `src/app/page.tsx`: 기본 페이지/레이아웃, API 호출 UI
  - `tsconfig.json`: Next 기본 설정
- 컴포즈
  - `docker-compose.yml`: `web` 서비스 추가(NEXT_PUBLIC_API_BASE=http://api:8000)

**사용 방법**
1) `.env` 준비(`cp .env.example .env` 후 필요시 `FRONTEND_ORIGIN` 조정)
2) 도커 실행: `docker compose up -d`
3) 접속: 프론트 `http://localhost:3000`, API 문서 `http://localhost:8000/docs`

**비고**
- 오디오/STT는 제외하고 텍스트 기반 Q/A만 제공
- 추후 UI 개선(경험 상세 폼/가이드, 선택 토글, 세션 진행 표시 등) 예정

