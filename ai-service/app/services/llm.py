# LLM call orchestration to answer, so it calls:
# retriever, then the context the prompt and at the end LLMClient
import logging
import time
from datetime import date

from app.clients.llm import LLMClient
from app.services.context_builder import ContextBuilder
from app.services.intention import IntentionService
from app.services.prompt_builder import PromptBuilder
from app.services.retrieval import BaseRetriever
from models.usage import TokenUsage

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
        usage: TokenUsage,
    ) -> tuple[str, str]:

        start = time.perf_counter()
        intent = await self._intention_service.classify(question, usage)

        logger.info(
            "intent_classified",
            extra={"intent": intent.value, "intent_ms": round((time.perf_counter() - start) * 1000)},
        )

        retrieval_result = await self._retriever.get_context(
            user_id=user_id,
            organization_id=organization_id,
            query=question,
            usage=usage,
            intent=intent, #Enum
        )

        today = date.today()
        context = self._context_builder.build_context(retrieval_result, usage, today=today)

        prompt = self._prompt_builder.build(
            user_question=question,
            today=today.isoformat(),
            context=context,
        )

        # Metrics
        start = time.perf_counter()
        answer, llm_usage = await self._llm_client.generate_response(prompt)
        usage.final_in += llm_usage.input_tokens
        usage.final_out += llm_usage.output_tokens
        logger.info(
            "llm_final_done",
            extra={"final_ms": round((time.perf_counter() - start) * 1000)},
        )

        return answer, intent.value
