# Service to validate the intention identified by the LLM

import logging
from enum import Enum

from app.clients.llm import LLMClient
from models.usage import TokenUsage 

logger = logging.getLogger(__name__)

class Intent(str, Enum):
    MONTHLY_SUMMARY = "monthly_summary"         # analytics/summary
    CATEGORY_SPENDING = "category_spending"     # categories
    TRANSACTIONS = "transactions"               # transactions
    UNSUPPORTED = "unsupported"

ENDPOINT_BY_INTENT = {
    Intent.MONTHLY_SUMMARY: "analytics/summary",
    Intent.CATEGORY_SPENDING: "categories",
    Intent.TRANSACTIONS: "transactions",
}

class IntentionService:
    def __init__(self, llm_client: LLMClient):
        self._llm_client = llm_client

    async def classify(self, question: str, usage: TokenUsage) -> Intent:
        prompt = f"""
Classify the following financial question into exactly one of these intents:

- monthly_summary: income/expense totals per month, balance, averages, month-to-month comparison, shared/organization spending.
- category_spending: spending/income by category, biggest category, list of categories, which category fits a transaction.
- transactions: top/largest expenses, last expense, listing recent transactions.
- unsupported: goals, investment advice, external data (e.g. crypto prices), bank import, future predictions, weekly or daily granularity, questions about one specific transaction (e.g. "why was my Uber on June 2 categorized as Transport?").

Question:
<question>
{question}
</question>

Return only the intent name.
"""

        result, llm_usage = await self._llm_client.generate_response(prompt)
        usage.intent_in += llm_usage.input_tokens
        usage.intent_out += llm_usage.output_tokens


        try:
            return Intent(result.strip().lower().strip(".\"'`"))
        except ValueError:
            logger.warning("intent_unrecognized", extra={"raw": result[:50]})
            return Intent.UNSUPPORTED
