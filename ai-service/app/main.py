import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.clients.django import MockDjangoClient
from app.clients.llm import LLMClient
from app.db import init_db_pool, close_db_pool
from app.config.logging import configure_logging
from app.db import close_db_pool, init_db_pool
from app.services.context_builder import ContextBuilder
from app.services.intention import IntentionService
from app.services.llm import LLMService
from app.services.prompt_builder import PromptBuilder
from app.services.retrieval import MockDocumentRepository, MockRetriever

configure_logging()

configure_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
    await init_db_pool(database_url)
    yield
    await close_db_pool()

llm_client = LLMClient()

intention_service = IntentionService(llm_client)

django_client = MockDjangoClient()
document_repository = MockDocumentRepository()

retriever = MockRetriever(
    doc_repo=document_repository,
    django_client=django_client,
)

context_builder = ContextBuilder()
prompt_builder = PromptBuilder()

llm_service = LLMService(
    intention_service=intention_service,
    retriever=retriever,
    context_builder=context_builder,
    prompt_builder=prompt_builder,
    llm_client=llm_client,
)

app = FastAPI(title="Poolaki AI Service", version="0.1.0", lifespan=lifespan)


app.include_router(health_router)
app.include_router(chat_router)
