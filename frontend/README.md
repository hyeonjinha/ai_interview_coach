# AI 면접 도우미 프론트엔드

AI가 도와주는 개인화된 면접 연습 플랫폼의 프론트엔드입니다.

## 🚀 주요 기능

### 📊 대시보드
- 개인 면접 준비 현황 요약
- 최근 면접 세션 내역
- 빠른 액션 버튼들
- 면접 준비 팁 제공

### 📝 경험 관리
- 프로젝트, 경력, 학력, 자격증, 어학 경험 등록
- 카테고리별 분류 및 검색
- 상세 경험 내용 작성 (STAR 기법 활용)

### 💼 지원 공고 관리
- 채용 공고 URL 또는 수동 등록
- 단계별 공고 정보 입력
- 지원서 질문 추가 및 관리
- 지원 상태 추적

### 🎯 AI 지원서 작성 도우미
- 지원서 질문에 대한 AI 경험 추천
- 관련 경험 자동 매칭 및 추천
- 경험 내용 클립보드 복사
- 실시간 추천 점수 표시

### 🎤 AI 면접 시뮬레이션
- 실시간 AI 면접관과의 대화
- 음성 또는 텍스트 답변 지원
- 동적 꼬리 질문 생성
- 실시간 답변 평가

### 📈 상세 피드백 리포트
- 종합 면접 점수 및 평가
- 역량별 레이더 차트
- 질문별 상세 피드백
- 강점과 개선점 분석
- 모범 답안 예시 제공

## 🛠 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **상태 관리**: Zustand
- **HTTP 클라이언트**: Axios + TanStack Query
- **UI 컴포넌트**: Radix UI + Headless UI
- **차트**: Recharts
- **아이콘**: Lucide React

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env.local
```

`.env.local` 파일을 수정하여 백엔드 API URL을 설정:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 빌드 및 배포
```bash
npm run build
npm start
```

## 🎨 디자인 시스템

### 색상 팔레트
- **Primary**: #4A90E2 (신뢰감을 주는 파란색)
- **Secondary**: #F5F7FA (부드러운 회색)
- **Accent**: #50E3C2 (성공, 긍정 피드백)
- **Danger**: #D0021B (에러, 경고)
- **Text Primary**: #333333
- **Text Secondary**: #767676

### 타이포그래피
- **Font Family**: Pretendard (한글/영문 최적화)
- **H1**: 32px, Bold
- **H2**: 24px, Bold
- **Body**: 16px, Regular
- **Caption**: 12px, Regular

### 컴포넌트 스타일
- **버튼**: 48px 높이, 8px 둥근 모서리
- **입력 필드**: 4px 둥근 모서리, 포커스 시 Primary 색상 테두리
- **카드**: 12px 둥근 모서리, 그림자 효과

## 📁 프로젝트 구조

```
frontend/
├── app/                    # Next.js App Router 페이지
│   ├── dashboard/         # 대시보드
│   ├── experiences/       # 경험 관리
│   ├── jobs/             # 지원 공고 관리
│   ├── interviews/       # 면접 내역
│   ├── login/            # 로그인
│   └── signup/           # 회원가입
├── components/           # 재사용 가능한 컴포넌트
│   ├── auth/            # 인증 관련
│   ├── navigation/      # 네비게이션
│   └── ui/              # 기본 UI 컴포넌트
├── lib/                 # 유틸리티 및 설정
├── stores/              # Zustand 상태 관리
├── types/               # TypeScript 타입 정의
└── utils/               # 헬퍼 함수들
```

## 🔄 주요 플로우

### 1. 온보딩 플로우
1. 랜딩 페이지 방문
2. 회원가입/로그인
3. 대시보드 진입

### 2. 면접 준비 플로우
1. 경험 등록 (선택사항)
2. 지원 공고 등록
3. 지원서 작성 (AI 추천 활용)
4. 면접 시뮬레이션
5. 피드백 확인

### 3. AI 추천 플로우
1. 지원서 질문 선택
2. AI 경험 추천 요청
3. 관련 경험 목록 표시
4. 경험 선택 및 내용 활용

## 🔐 인증 및 권한

- JWT 토큰 기반 인증
- 로컬 스토리지를 통한 토큰 관리
- 보호된 라우트 (ProtectedRoute 컴포넌트)
- 자동 토큰 갱신 및 만료 처리

## 📱 반응형 디자인

- 모바일 우선 (Mobile-first) 접근
- Tailwind CSS 반응형 클래스 활용
- 3가지 주요 브레이크포인트:
  - 모바일: ~ 768px
  - 태블릿: 768px ~ 1024px
  - 데스크톱: 1024px ~

## 🎯 성능 최적화

- Next.js 15의 App Router 활용
- 동적 임포트를 통한 코드 분할
- 이미지 최적화 (next/image)
- TanStack Query를 통한 효율적인 데이터 캐싱
- Zustand의 선택적 렌더링

## 🧪 테스트

```bash
# 타입 체크
npm run type-check

# 린트 검사
npm run lint
```

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

## 🆘 문의

문제가 있거나 제안사항이 있으시면 이슈를 생성해 주세요.

