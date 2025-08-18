## 018_auth_gate_login_flow

- 대시보드 요약 API에 인증 의존성 주입(토큰에서 user 식별)
- AuthGate: 로그인/회원가입 경로는 우회, 미인증시 /login 리다이렉트
- Providers: Axios 인터셉터(Authorization 주입/401 처리)
- 레이아웃: 상단 타이틀 그라디언트, 서브카피 추가

