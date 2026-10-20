#  How: process data
import json
from datetime import date

from app.config.settings import settings
from models.retrieval import CombinedRetrievalResult, RetrievedItem
from models.usage import TokenUsage

NO_CONTEXT = "No relevant information was found."
SOURCE_LABELS = {"django_api": "financial_data", "vector_db": "product_docs", "system": "system_note"}


def estimate_tokens(text: str) -> int:
    # Simple estimation(~4 characteres per token)
    return len(text) // 4


class ContextBuilder:
    def build_context(
        self,
        retrieval_result: CombinedRetrievalResult,
        usage: TokenUsage,
        today: date,
    ) -> str:

        if not retrieval_result.items:
            return NO_CONTEXT

        parts = [self._format_item(item, today) for item in retrieval_result.items]

        context = "\n\n".join(parts)

        usage.context_est = estimate_tokens(context)

        return context

    def _format_item(self, item: RetrievedItem, today: date) -> str:
        """Make each RetrievedItem into text for the context"""

        label = SOURCE_LABELS.get(item.source, "data")

        if item.type != "structured_data":
            return f"[{label}]\n{item.content}"  # (pgvector)

        data = json.loads(item.content)
        endpoint = item.metadata.get("endpoint", "")
        window = self._window(endpoint, data, today)

        # /transactions/ cut the oldest if needed
        note = ""
        txs = data.get("transactions")
        if txs is not None:
            total = len(txs)
            while (
                txs and estimate_tokens(json.dumps(data)) > settings.max_context_tokens
            ):
                txs = txs[
                    : len(txs) // 2
                ]  # newest-first (django) this // 2 is ok for MVP
                data["transactions"] = txs
            if len(txs) < total:
                note = f"\nNote: showing only the {len(txs)} most recent of {total} transactions."

        return f"[{label}] {window}\n{json.dumps(data, ensure_ascii=False)}{note}"

    def _window(self, endpoint: str, data: dict, today: date) -> str:
        if "analytics/summary" in endpoint or "categories" in endpoint:
            return (
                f"Data window: calendar year {data['year']}, monthly breakdown "
                "(month 1 = January). Balance is as of today over the full history."
            )
        if "transactions" in endpoint:
            m, y = today.month - 2, today.year
            if m < 1:
                m, y = m + 12, y - 1
            return (
                f"Data window: income/expense transactions from {date(y, m, 1)} to {today}, "
                "newest first."
            )
        return ""
