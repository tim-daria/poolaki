# LLM call orchestration to answer, so it calls:
# retriever, then the context the prompt and at the end LLMClient

from app.clients.llm import LLMClient
from app.services.context_builder import ContextBuilder
from app.services.intention import IntentionService
from app.services.prompt_builder import PromptBuilder
from app.services.retrieval import BaseRetriever

# Later I'll implement a fallback between models
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

        intent = await self._intention_service.classify(question)
        retrieval_result = await self._retriever.get_context(
            user_id=user_id,
            organization_id=organization_id,
            query=question,
            intent=intent.value,
        )

        context = self._context_builder.build_context(retrieval_result)

        prompt = self._prompt_builder.build(
            user_question=question,
            context=context,
        )

        answer = await self._llm_client.generate_response(prompt)
        return answer, intent.value