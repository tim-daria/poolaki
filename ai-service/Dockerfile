FROM python:3.12-slim-bookworm

WORKDIR /app

COPY pyproject.toml .

RUN pip install --upgrade pip \
    && pip install .

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]