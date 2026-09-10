from typing import Any

import httpx

from app.config.settings import settings


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
        payload: dict[str, Any] = {
            "model": settings.llm_model,
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

        if response.is_error:
            print("LLM ERROR STATUS:", response.status_code)
            print("LLM ERROR BODY:", response.text)

        response.raise_for_status()

        data = response.json()

        # print("LLM RESPONSE:", data) # Debbug

        return data["choices"][0]["message"]["content"]

    async def close(self) -> None:
        await self._client.aclose()
