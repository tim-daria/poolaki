import os

import requests

from core.services.exceptions import AiServiceError, AiServiceUnavailableError

AI_SERVICE_URL = os.environ["AI_SERVICE_URL"]
AI_SERVICE_TIMEOUT = float(os.environ["AI_SERVICE_TIMEOUT"])

# AI service statuses the client can act on (bad request, access denied);
# everything else degrades to 503 unavailable.
RELAYED_AI_STATUSES = (400, 403)


def send_question(user_id: int, organization_id: int, question: str) -> tuple[str, str]:
    """Send one question to the AI service and return (answer, intent).

    Raises:
        AiServiceError: on 400/403; the status is relayed so the frontend
            shows the matching copy.
        AiServiceUnavailableError: on network failure, any other non-200
            status, or an unexpected response shape.
    """
    url = f"{AI_SERVICE_URL.rstrip('/')}/api/v1/chat"
    payload = {
        "user_id": user_id,
        "organization_id": organization_id,
        "question": question,
    }

    try:
        response = requests.post(url, json=payload, timeout=AI_SERVICE_TIMEOUT)
    except requests.exceptions.RequestException as exc:
        raise AiServiceUnavailableError() from exc

    if response.status_code in RELAYED_AI_STATUSES:
        raise AiServiceError(response.status_code)
    if response.status_code != 200:
        raise AiServiceUnavailableError()

    try:
        data = response.json()
        answer = data["answer"]
        intent = data["metadata"]["intent"]
    except (ValueError, KeyError, TypeError) as exc:
        raise AiServiceUnavailableError() from exc

    # str() coercion would turn null/numbers into user-visible "None" text.
    if not isinstance(answer, str) or not answer:
        raise AiServiceUnavailableError()
    if not isinstance(intent, str):
        raise AiServiceUnavailableError()

    return answer, intent
