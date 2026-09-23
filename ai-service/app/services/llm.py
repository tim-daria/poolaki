# LLM call orchestration to answer, so it calls:
# retriever, then the context the prompt and at the end LLMClient
import logging
import time

from app.clients.llm import LLMClient
from app.services.context_builder import ContextBuilder
from app.services.intention import IntentionService
from app.services.prompt_builder import PromptBuilder
from app.services.retrieval import BaseRetriever

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(
        self,
        intention_service: IntentionService,
        retriever: BaseRetriever,
        context_builder: ContextBuilder,
        prompt_builder: PromptBuilder,
        llm_client: LLMClient,
    ) -> None:
        self._intention_service = intention_service
        self._retriever = retriever
        self._context_builder = context_builder
        self._prompt_builder = prompt_builder
        self._llm_client = llm_client

    async def generate_response(
        self,
        user_id: int,
        organization_id: int,
        question: str,
    ) -> tuple[str, str]:

        start = time.perf_counter()
        intent = await self._intention_service.classify(question)
        retrieval_result = await self._retriever.get_context(
            user_id=user_id,
            organization_id=organization_id,
            query=question,
            intent=intent.value,
        )

        logger.info(
            "Retrieval duration=%.2fs",
            time.perf_counter() - start,
        )

        start = time.perf_counter()
        context = self._context_builder.build_context(retrieval_result)

        start = time.perf_counter()
        prompt = self._prompt_builder.build(
            user_question=question,
            context=context,
        )

        logger.info(
            "Prompt building duration=%.2fs",
            time.perf_counter() - start,
        )

        start = time.perf_counter()
        answer = await self._llm_client.generate_response(prompt)

        logger.info(
            "Final LLM generation duration=%.2fs",
            time.perf_counter() - start,
        )

        return answer, intent.value
