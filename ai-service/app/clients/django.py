import logging
from typing import Any

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)

class DjangoClientError(Exception):
    """Error in the API contract format: {"error": {"code", "message"}}."""

    def __init__(self, code: str, message: str, status_code: int):
        super().__init__(message)
        self.code = code  # FORBIDDEN, INVALID_REQUEST, INTERNAL_ERROR, ...
        self.status_code = status_code


class DjangoClient:
    """Real HTTP client for the /api/internal/v1/ namespace."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(base_url=settings.django_base_url)

    async def fetch_backend_data(
        self, endpoint: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        try:
            response = await self._client.post(endpoint, json=payload)
        except httpx.HTTPError as exc:  # network, timeout, DNS...
            logger.warning(
                "django_request_failed",
                extra={"endpoint": endpoint, "error": type(exc).__name__},
            )
            raise DjangoClientError(
                "INTERNAL_ERROR", "Backend unreachable", 502
            ) from exc

        if response.is_error:
            code, message = "INTERNAL_ERROR", "Backend error"
            try:
                error = response.json().get("error", {})
                code = error.get("code", code)
                message = error.get("message", message)
            except ValueError:  # body was not JSON
                pass
            logger.warning(
                "django_error_response",
                extra={
                    "endpoint": endpoint,
                    "status_code": response.status_code,
                    "code": code,
                },
            )
            raise DjangoClientError(code, message, response.status_code)

        return response.json()

    async def close(self) -> None:
        await self._client.aclose()
