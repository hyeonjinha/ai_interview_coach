### 001: 프로젝트 스캐폴딩 & 인프라

**핵심**
- FastAPI 애플리케이션 베이스 구성 및 실행 환경 준비
- Docker/Docker Compose, 환경변수 템플릿, 기본 라우팅 작성

**포함 파일**
- `requirements.txt`: FastAPI, Uvicorn 등 기본 의존성
- `.env.example`: 환경 변수 템플릿(OPENAI_API_KEY, LLM_MODEL 등)
- `Dockerfile`, `docker-compose.yml`: 컨테이너 실행 구성
- `app/main.py`: FastAPI 앱 생성, 라우터 등록
- `app/core/config.py`: 환경변수 로딩(Pydantic Settings)
- `README.md`: 빠른 시작 가이드

**주요 내용**
- 앱 실행 시 DB 초기화 훅(lifespan) 호출
- `/` 루트 및 `/health/z` 헬스 엔드포인트 준비
- 로컬 개발을 위한 `uvicorn --reload`와 Docker 모두 지원

