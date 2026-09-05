# bookworm is a debian linux version
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	UV_SYSTEM_PYTHON=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt-get update && apt-get install -y curl

WORKDIR /app

COPY ./django/pyproject.toml ./django/uv.lock ./

RUN uv export --frozen --no-dev | uv pip install --system --no-cache -r -

COPY ./django .

RUN chmod +x entrypoint.sh

RUN useradd -u 1000 -m django
USER django

EXPOSE 8000

CMD ["./entrypoint.sh"]
