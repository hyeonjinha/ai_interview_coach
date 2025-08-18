### 005: 인터뷰 엔진 (RAG + Agent)

**핵심**
- 선택된 경험/공고를 인덱싱하고 RAG 컨텍스트로 질문 생성
- Agent가 답변 평가 후 분기(GOOD/VAGUE/OFF_TOPIC) 및 꼬리질문 관리

**포함 파일**
- `app/core/llm.py`: OpenAI 또는 휴리스틱 LLM 서비스
- `app/services/rag_service.py`: 문서 빌드/인덱싱/검색, 질문 생성 프롬프트
- `app/services/agent_service.py`: 세션 시작, 평가/분기, 질문 생성
- `app/api/routers/interview.py`: `POST /interviews/start`, `GET /interviews/{id}/next`, `POST /interviews/{id}/answer/{qid}`

**주요 내용**
- 평가 프롬프트는 4가지 기준(질문이해/STAR/기술깊이/문제해결)
- `MAX_FOLLOW_UPS` 제한 내에서 꼬리질문 생성, 초과 시 다음 메인 질문 전환

