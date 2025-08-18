### 007: 오디오 답변(STT 스텁) 및 품질 개선

**핵심**
- 오디오 업로드 엔드포인트 추가(현재 STT 스텁)
- 텔레메트리 소음 제거, 평가 JSON 파싱 안정화

**포함 파일/변경**
- `app/services/stt_service.py`: STT 스텁 구현
- `app/api/routers/interview.py`: `POST /interviews/{id}/answer/{qid}/audio`, `GET /interviews/{id}/transcript`, `POST /interviews/{id}/end`
- `app/core/vectorstore.py`: `CHROMA_TELEMETRY_ENABLED=false`
- `app/services/agent_service.py`: JSON 추출 정규식 적용으로 파싱 내성 강화
- `requirements.txt`: `python-multipart` 추가(파일 업로드 필요)

**주요 내용**
- 실제 STT는 Whisper/faster-whisper 연동 예정(플러그 가능 구조)
- 업로드 파일명 기반으로 임시 텍스트 생성 후 동일 평가/분기 로직 적용

