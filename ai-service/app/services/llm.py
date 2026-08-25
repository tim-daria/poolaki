# LLM call orchestration to answer, so it calls:
# retriever, then the context the prompt and at the end LLMClient

from app.clients.llm import LLMClient


class LLMService:
    def __init__(
        self,
        retriever: BaseRetriever,
        context_builder: ContextBuilder,
        prompt_builder: PromptBuilder,
        llm_client: LLMClient,
    ):
        self._retriever = retriever
        self._context_builder = context_builder
        self._prompt_builder = prompt_builder
        self._llm_client = llm_client