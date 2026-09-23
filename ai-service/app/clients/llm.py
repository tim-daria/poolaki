import logging
import time
from typing import Any

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)


class LLMClientError(Exception):
    """All LLM attempts fail."""


class LLMClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.llm_base_url,
            timeout=settings.llm_timeout,
            headers={
                "Authorization": f"Bearer {settings.llm_api_key}",
                "Content-Type": "application/json",
            },
        )

    async def generate_response(self, prompt: str) -> str:
        models = [settings.llm_model, settings.llm_fallback_model]
        last_error: Exception | None = None

        for model in models:
            for attempt in range(settings.llm_max_retries + 1):
                start_time = time.perf_counter()

                try:
                    payload: dict[str, Any] = {
                        "model": model,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt,
                            }
                        ],
                    }

                    response = await self._client.post(
                        "/chat/completions",
                        json=payload,
                    )
                    response.raise_for_status()

                    data: dict[str, Any] = response.json()
                    # print("LLM RESPONSE:", data)
                    content = (
                        data.get("choices", [{}])[0].get("message", {}).get("content")
                    )

                    if not content:
                        raise LLMClientError("LLM response missing content")

                    logger.info(
                        "LLM response successful: model=%s time=%.2fs",
                        model,
                        time.perf_counter() - start_time,
                    )

                    return content
                except (httpx.HTTPError, LLMClientError) as exc:
                    last_error = exc
                    logger.warning(
                        "LLM attempt failed: model=%s attempt=%s",
                        model,
                        attempt + 1,
                    )

        raise LLMClientError("All LLM attempts failed") from last_error

    async def close(self) -> None:
        await self._client.aclose()
