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
                        "LLM response successful",
                        extra={
                            "model": model,
                            "attempt": attempt + 1,
                            "duration": round(
                                time.perf_counter() - start_time,
                                2,
                            ),
                        },
                    )

                    return content

                except httpx.TimeoutException as exc:
                    last_error = exc

                    logger.warning(
                        "LLM timeout",
                        extra={
                            "model": model,
                            "attempt": attempt + 1,
                        },
                    )

                except httpx.HTTPStatusError as exc:
                    status_code = exc.response.status_code

                    logger.warning(
                        "LLM request failed",
                        extra={
                            "model": model,
                            "attempt": attempt + 1,
                            "status_code": status_code,
                        },
                    )

                    if not self._is_retryable_status(status_code):
                        raise LLMClientError(
                            f"Non-retryable LLM error: {status_code}"
                        ) from exc

                    last_error = exc

                except LLMClientError as exc:
                    last_error = exc

                    logger.warning(
                        "LLM response validation failed: model=%s attempt=%s",
                        model,
                        attempt + 1,
                    )

        raise LLMClientError("All LLM attempts failed") from last_error

    def _is_retryable_status(self, status_code: int) -> bool:
        return status_code in {429, 502, 503}

    async def close(self) -> None:
        await self._client.aclose()
