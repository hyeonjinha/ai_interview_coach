## AI Interview Coach (Backend)

### 빠른 시작
- 사전 요구사항: Docker, Docker Compose (또는 로컬 Python 3.11)

1) 환경 변수 준비
```bash
cp .env.example .env
# .env 내용을 필요에 맞게 수정 (OPENAI_API_KEY 설정 권장)
```

2) Docker 실행
```bash
docker compose up --build
```
→ http://localhost:8000/docs 에서 API 확인

3) 로컬 실행 (선택)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 개요
- FastAPI 기반 API 서버
- RAG: ChromaDB(로컬 퍼시스턴스) + 임베딩(OpenAI 또는 Sentence-BERT)
- Agent: 면접 질의/응답 흐름 제어, 답변 평가/분기, 피드백 생성

### 주요 ENV
- `OPENAI_API_KEY`: 설정 시 OpenAI LLM/임베딩 우선 사용
- `EMBEDDING_PROVIDER`: auto | openai | sentence-transformers
- `CHROMA_PERSIST_DIR`: 기본 `./data/chroma`
- `DATABASE_URL`: 기본 `sqlite:///./data/app.db`

### 현재 제공 API (요약)
- 경험 CRUD: `POST/GET/PUT/DELETE /experiences`
- 공고 등록: `POST /jobs` (URL 또는 텍스트)
- 경험 추천: `POST /recommendations`
- 인터뷰 세션: 시작/다음질문/답변/피드백

### 주의
- OPENAI 키가 없으면 간단한 휴리스틱/로컬 임베딩으로 동작합니다(정확도 제한).
- 음성(STT)은 이후 단계에서 연동 예정이며 엔드포인트는 스텁 형태로 제공됩니다.

