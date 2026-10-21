# Service to validate the intention identified by the LLM

from enum import Enum

from app.clients.llm import LLMClient


class Intent(str, Enum):
    SUMMARY = "summary"
    CATEGORIES = "categories"
    TRANSACTIONS = "transactions"
    # GOAL_PROGRESS = "goal_progress"


class IntentionService:
    def __init__(self, llm_client: LLMClient):
        self._llm_client = llm_client

    async def classify(self, question: str) -> Intent:
        prompt = f"""
Classify the following financial question into exactly one of these intents:

- summary
- categories
- transactions

Question:
{question}

Return only the intent name.
"""

        result = await self._llm_client.generate_response(prompt)

        try:
            return Intent(result.strip().lower())
        except ValueError:
            raise ValueError("LLM returned an unsupported intent")
