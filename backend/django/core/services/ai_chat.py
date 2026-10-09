import os

import requests

from core.services.exceptions import AiServiceUnavailableError

AI_SERVICE_URL = os.environ["AI_SERVICE_URL"]
AI_SERVICE_TIMEOUT = float(os.environ["AI_SERVICE_TIMEOUT"])


def send_question(user_id: int, organization_id: int, question: str) -> tuple[str, str]:
    """Send one question to the AI service and return (answer, intent).

    Raises:
        AiServiceUnavailableError: on network failure, non-200 status, or an
            unexpected response shape. The frontend only distinguishes 503
            from validation errors, so all failures degrade to unavailable.
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

    if response.status_code != 200:
        raise AiServiceUnavailableError()

    try:
        data = response.json()
        answer = str(data["answer"])
        intent = str(data["metadata"]["intent"])
    except (ValueError, KeyError, TypeError) as exc:
        raise AiServiceUnavailableError() from exc

    if not answer:
        raise AiServiceUnavailableError()

    return answer, intent
