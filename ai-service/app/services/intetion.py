# Service to validate the intention identified by the LLM

from enum import Enum

from app.clients.llm import LLMClient


class Intent(str, Enum):
    MONTHLY_SUMMARY = "monthly_summary"
    RECENT_TRANSACTIONS = "recent_transactions"
    GOAL_PROGRESS = "goal_progress"


class IntentionService:
    def __init__(self, llm_client: LLMClient):
        self._llm_client = llm_client

    async def classify(self, question: str) -> Intent:
        prompt = f"""
Classify the following financial question into exactly one of these intents:

- monthly_summary
- recent_transactions
- goal_progress

Question:
{question}

Return only the intent name.
"""

        result = await self._llm_client.generate_response(prompt)

        try:
            return Intent(result.strip.lower())
        except ValueError as exc:
            raise ValueError(
                f"LLM returned unsupported intent: {normalized_result}"
            ) from exc