import logging
import time
from typing import Any

import httpx

from app.config.settings import settings
from models.usage import LLMUsage

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
        self._embedding_client = httpx.AsyncClient(
            base_url=settings.embedding_base_url or settings.llm_base_url,
            timeout=settings.llm_timeout,
            headers={
                "Authorization": (
                    f"Bearer {settings.embedding_api_key or settings.llm_api_key}"
                ),
                "Content-Type": "application/json",
            },
        )

    async def generate_response(self, prompt: str) -> tuple[str, LLMUsage]:
        models = [settings.llm_model]

        if settings.llm_fallback_model:
            models.append(settings.llm_fallback_model)
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

                    raw_usage = data.get("usage") or {}
                    llm_usage = LLMUsage(
                        input_tokens=raw_usage.get("prompt_tokens", 0),
                        output_tokens=raw_usage.get("completion_tokens", 0),
                    )

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

                    return content, llm_usage

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

    async def generate_embeddings(
        self, texts: list[str], purpose: str = "unknown"
    ) -> tuple[list[list[float]], LLMUsage]:
        # Track the last exception to raise if all retries fail
        last_error: Exception | None = None

        for attempt in range(settings.llm_max_retries + 1):
            start_time = time.perf_counter()

            try:
                payload: dict[str, Any] = {
                    "model": settings.embedding_model,
                    "input": texts,
                }

                response = await self._embedding_client.post(
                    "/embeddings",
                    json=payload,
                )
                response.raise_for_status()

                data = response.json()
                embeddings: list[list[float]] = []

                # Extract the vector array for each input chunk
                for item in data.get("data", []):
                    embeddings.append(item.get("embedding"))

                usage = data.get("usage", {})
                prompt_tokens = int(usage.get("prompt_tokens") or 0)

                logger.info(
                    "Embeddings generated successfully",
                    extra={
                        "model": settings.embedding_model,
                        "purpose": purpose,
                        "prompt_tokens": prompt_tokens,
                        "duration": round(time.perf_counter() - start_time, 2),
                        "chunks_count": len(texts),
                    },
                )

                return embeddings, LLMUsage(input_tokens=prompt_tokens)

            except httpx.TimeoutException as exc:
                last_error = exc
                logger.warning(
                    "Embedding timeout",
                    extra={"attempt": attempt + 1},
                )

            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                logger.warning(
                    "Embedding request failed",
                    extra={"attempt": attempt + 1, "status_code": status_code},
                )

                if not self._is_retryable_status(status_code):
                    raise LLMClientError(
                        f"Non-retryable embedding error: {status_code}"
                    ) from exc

                last_error = exc

            except (httpx.HTTPError, ValueError) as exc:
                last_error = exc
                logger.warning(
                    "Embedding unexpected error",
                    extra={"attempt": attempt + 1},
                )

        raise LLMClientError("All embedding attempts failed") from last_error

    def _is_retryable_status(self, status_code: int) -> bool:
        return status_code in {429, 502, 503}

    async def close(self) -> None:
        await self._client.aclose()
        await self._embedding_client.aclose()
