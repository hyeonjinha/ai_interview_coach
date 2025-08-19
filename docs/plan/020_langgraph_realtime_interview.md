### LangGraph/LangSmith 기반 실시간 면접 리팩토링 계획

#### 목표
- LLM+RAG 기반으로 프로젝트/공고 맥락에 맞는 고품질 질문과 즉시성 있는 면접 흐름 제공
- 답변 평가와 후속/다음 질문 생성을 병렬화하여 체감 지연 < 1s 달성(스트리밍 포함)
- 종료 후 심층 피드백 리포트를 신뢰 가능한 근거와 함께 생성
- LangSmith로 단계별 디버깅/관측성 확보

#### 범위(이번 작업)
- 백엔드: LangGraph 워크플로우 도입(상태/노드/에지), 평가/질문 병렬화, 스트리밍 준비, 프롬프트/룰 정리
- 프론트엔드: 불필요 지연 제거, 로딩/프리로더 개선, 스트리밍 수신 준비
- 워커/피드백: JSON 스키마 강화 및 근거 인용 일관화

---

### 규칙(요약)
- 메인 질문: 1~2문장, 25~45어(라운드 3+는 35~60허용), 컨텍스트 직접 인용 1회 권장
- 꼬리 질문: 1문장, ≤25어, 한 가지 초점(clarify/quantify/justify/contrast/boundary)
- 분기: GOOD → 다음 라운드 / VAGUE, OFF_TOPIC → 꼬리(최대 MAX_FOLLOW_UPS 후 다음 라운드)
- 종료 가드: 하드 리밋, 품질 수렴(최근 2회 중 1회 GOOD), 시간/중복 가드
- 피드백: JSON 스키마(점수/강점/약점/액션팁/역량점수/모범답안/다음 포커스), 근거 인용 필수

---

### 변경 사항(컴포넌트별)
- app/core/llm.py
  - [완료] OpenAI 스트리밍 지원, LangSmith 설정 훅, 휴리스틱 제거(OpenAI 필수)

- app/services/rag_service.py
  - 컨텍스트 재랭킹(공고 섹션/경험 핵심 가중치), 메인 질문 프롬프트 규칙 반영

- app/services/agent_service.py
  - 기존 submit_answer 로직을 LangGraph 호출로 대체(병렬화/사전생성)
  - 평가 JSON 스키마 강화(missing_dims, hints 안정화)

- app/services/graph/ (신규)
  - state.py: InterviewState 정의(최소 상태)
  - interview_graph.py: 노드(load_ctx, save_and_eval, gen_follow_up, gen_next_main, emit_*), 분기 로직

- app/api/routers/interview.py
  - 기존 동기 엔드포인트 유지
  - 추가: 스트리밍 엔드포인트(선택)

- frontend/app/jobs/[id]/interview/page.tsx
  - 불필요 setTimeout 제거, 로딩 버블/프리로더 개선
  - (선택) 스트리밍 수신 컴포넌트 추가

- app/services/feedback_service.py
  - JSON 스키마로 피드백 생성(근거 인용 포함), 진행률 보고 유지

---

### 커밋 단위(단계별)
1) deps/플랫폼 정리 [완료]
   - uv 도입, requirements 간소화, LangGraph/LangSmith 추가
   - LLM 스트리밍/Heuristic 제거, LangSmith 초기화(main)

2) LangGraph 스켈레톤 추가 [이 커밋]
   - app/services/graph/state.py, interview_graph.py 추가(와이어링 전)

3) RAG/프롬프트 정리
   - generate_question_from_context에 규칙 반영
   - 평가 프롬프트(JSON 스키마/함수호출 모드 고려)

4) Agent → Graph 연동
   - submit_answer가 LangGraph를 호출하여 병렬 후보 생성/분기/질문 저장
   - (옵션) 세션 시작 시 사전 질문 생성 비동기화

5) API/스트리밍
   - (옵션) /answer/{id}/stream 또는 /next/stream 추가
   - 클라이언트 토큰 스트리밍 수신 준비

6) 프론트 최적화
   - 인위적 지연 제거, 프리로더/타이핑 효과, UX 폴리싱

7) 피드백 스키마/프롬프트 개선
   - JSON 구조 반영, 근거 인용, 점수화 일관화

---

### 플래그/설정
- ENV: dev/prod
- OPENAI_API_KEY, LLM_MODEL
- MAX_FOLLOW_UPS(기본 3)
- LANGCHAIN_TRACING_V2, LANGCHAIN_API_KEY, LANGCHAIN_PROJECT

---

### 검증/롤백
- 검증: 첫 질문 < 2s, 후속 질문 체감 < 1s(스트리밍 시 즉시 표시), LangSmith 트레이스 확인
- 문제 시 롤백: API 라우터에서 기존 Agent 경로로 스위치, graph 모듈 비활성화

---

### 간단 테스트 체크리스트
- 세션 시작 → 첫 질문 생성
- 답변 제출 → 평가 로그/분기/질문 저장 확인
- MAX_FOLLOW_UPS 초과 시 다음 라운드 전환
- 피드백 JSON 생성/저장
- 스트리밍(선택)에서 질문 토큰 도착/렌더 확인


