class PersonalOrganizationMissingError(Exception):
    """Raised when a user does not have a personal organization."""

    pass


class AiServiceUnavailableError(Exception):
    """Raised when the AI service cannot produce an answer (network failure,
    non-200 status, or malformed response)."""

    pass
