#  How: process data

from models.context import CombinedRetrievalResult


class ContextBuilder:
    MAX_CONTEXT_LENGTH = 4000  # set for now, might change when LLM is implemented

    def build_context(
        self, retrieval_result: CombinedRetrievalResult
    ) -> str:

        parts: list[str] = []

        for item in retrieval_result.items:
            parts.append(
                f"[{item.source}]\n{item.content}"
            )

        context = "\n\n".join(parts)

        return context[: self.MAX_CONTEXT_LENGTH]
