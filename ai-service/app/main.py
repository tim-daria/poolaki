"""FastAPI application wiring: lifespan and router registration."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.api.ingest import router as ingest_router
from app.clients.django import DjangoClient
from app.clients.llm import LLMClient
from app.config.logging import configure_logging
from app.config.settings import settings
from app.db import close_db_pool, init_db_pool

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.settings = settings

    await init_db_pool(settings.database_url)

    app.state.django_client = DjangoClient()
    app.state.llm_client = LLMClient()

    yield

    await app.state.django_client.close()
    await close_db_pool()


app = FastAPI(title="Poolaki AI Service", version="0.1.0", lifespan=lifespan)


app.include_router(health_router)
app.include_router(chat_router)
app.include_router(ingest_router)
