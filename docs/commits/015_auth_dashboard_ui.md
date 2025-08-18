## 015_auth_dashboard_ui

- 백엔드
  - 의존성: python-jose[cryptography], passlib[bcrypt] 추가
  - 모델: User 엔티티 추가(해시/검증 유틸 포함)
  - 인증: app/core/auth.py JWT 발급/검증, app/api/deps.py 토큰 디펜던시
  - 라우터: /auth/signup, /auth/login 추가
  - 대시보드: /dashboard/summary 추가(최근 세션 5개 포함)
- 프론트
  - 로그인/회원가입 페이지 추가, 토큰 localStorage 저장
  - Axios 인터셉터로 Authorization 자동 주입 및 401 시 로그인 리다이렉트
  - 대시보드 통계 카드, 최근 면접 섹션, lucide 아이콘 탑재

동작 확인
- 회원가입 → 토큰 발급 → 대시보드 요약 호출 정상
- 대시보드: 경험/공고/면접 수와 최근 5개 세션 표시

