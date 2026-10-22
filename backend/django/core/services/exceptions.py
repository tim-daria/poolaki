class PersonalOrganizationMissingError(Exception):
    """Raised when a user does not have a personal organization."""

    pass


class AiServiceUnavailableError(Exception):
    """Raised when the AI service cannot produce an answer (network failure,
    non-200 status, or malformed response)."""

    pass


class AiServiceError(Exception):
    """The AI service rejected the request with a client-meaningful status
    (400/403); status_code is relayed to the client as-is."""

    def __init__(self, status_code: int) -> None:
        super().__init__(f"AI service error (HTTP {status_code})")
        self.status_code = status_code
