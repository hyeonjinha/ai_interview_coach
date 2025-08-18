# 빌드 스테이지 - uv를 사용한 빠른 의존성 설치
FROM python:3.11-slim as builder

# uv 설치
RUN pip install uv

WORKDIR /app

# requirements.txt 복사
COPY requirements.txt .

# uv로 의존성 설치 (pip보다 훨씬 빠름) - --system 플래그로 가상환경 오류 해결
RUN uv pip install --system --no-cache -r requirements.txt

# 런타임 스테이지 - 최소한의 이미지
FROM python:3.11-slim

# 시스템 패키지 설치 (최소한만)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 빌드된 패키지만 복사 (빌드 스테이지에서)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 애플리케이션 코드 복사
COPY . .

# 환경 변수 설정
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

