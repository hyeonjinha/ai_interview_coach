### 002: 도메인 모델 및 DB 세팅

**핵심**
- SQLModel 기반 엔티티 및 세션/엔진 설정

**포함 파일**
- `app/models/db.py`: 엔진/세션 팩토리, 테이블 생성
- `app/models/entities.py`: Experience, JobPosting, InterviewSession, InterviewQuestion, InterviewAnswer, FeedbackReport
- `app/models/schemas.py`: 요청/응답 Pydantic 스키마 정의

**주요 내용**
- `Experience.content`, `JobPosting.sections` 등 JSON 컬럼으로 유연한 구조 저장
- 인터뷰 세션의 상태(`current_round`, `follow_up_count`) 및 Q/A/피드백 저장 구조 마련

