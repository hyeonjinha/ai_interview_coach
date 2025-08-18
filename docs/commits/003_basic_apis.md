### 003: 기본 API (경험/공고)

**핵심**
- 경험 CRUD, 공고 등록/조회 API

**포함 파일**
- `app/api/routers/health.py`: 헬스 체크
- `app/api/routers/experiences.py`: `POST/GET/PUT/DELETE /experiences`
- `app/api/routers/jobs.py`: `POST /jobs`(수동 텍스트 또는 URL), `GET /jobs/{id}`

**주요 내용**
- 공고 텍스트는 휴리스틱으로 섹션 키(`responsibilities`, `requirements`, `preferred`)를 생성
- URL 입력 시 `BeautifulSoup`로 본문 텍스트만 추출(옵션값 `ALLOW_URL_FETCH`)

