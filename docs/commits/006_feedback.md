### 006: 실행 가능한 피드백 리포트

**핵심**
- 한 세트(원 질문 + 꼬리질문) 종료 후 종합 피드백 생성

**포함 파일**
- `app/services/feedback_service.py`: 대화 로그 수집 → LLM 요약 → 리포트 저장/반환
- 인터뷰 라우터: `GET /interviews/{id}/feedback`

**주요 내용**
- 리포트 구조: overall, strengths, areas, model_answer
- JSON 파싱 실패 시 기본 템플릿으로 폴백

