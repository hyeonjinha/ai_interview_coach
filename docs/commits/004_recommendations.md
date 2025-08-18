### 004: AI 경험 추천 (의미 유사도)

**핵심**
- 공고 섹션과 경험 텍스트 임베딩 후 코사인 유사도 기반 추천

**포함 파일**
- `app/core/embeddings.py`: OpenAI 또는 Sentence-BERT 로컬 임베딩 자동 선택
- `app/core/vectorstore.py`: 로컬 ChromaDB 래퍼(퍼시스턴스)
- `app/services/recommendation_service.py`: 추천 로직
- `app/api/routers/recommendations.py`: `POST /recommendations`

**주요 내용**
- `EMBEDDING_PROVIDER=auto` 시 OPENAI 키 존재 여부에 따라 자동 선택
- 정량적 점수(score)와 임계값 기준 기본 선택(selected) 제공

