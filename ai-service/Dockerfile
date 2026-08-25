FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1\
	UV_SYSTEM_PYTHON=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./

# Production:
# RUN uv export --frozen --no-dev | uv pip install --system --no-cache -r -
# Development:
RUN uv export --frozen --group dev | uv pip install --system --no-cache -r -

COPY app/ ./app/
COPY tests/ ./app/tests/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]