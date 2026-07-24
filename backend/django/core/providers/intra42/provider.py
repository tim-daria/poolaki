from typing import Any

from allauth.account.models import EmailAddress
from allauth.socialaccount.providers.base import ProviderAccount
from allauth.socialaccount.providers.oauth2.provider import OAuth2Provider
from django.http import HttpRequest


class FortyTwoAccount(ProviderAccount):
    def to_str(self) -> str:
        return self.account.extra_data.get("login", super().to_str())


class FortyTwoProvider(OAuth2Provider):
    id = "intra42"
    name = "42"
    account_class = FortyTwoAccount

    def get_oauth2_adapter(self, request: HttpRequest):
        from .views import FortyTwoOAuth2Adapter  # need here

        return FortyTwoOAuth2Adapter(request)

    def extract_uid(self, data: dict[str, Any]) -> str:
        return str(data["id"])

    def extract_common_fields(self, data: dict[str, Any]) -> dict[str, Any]:
        return {"email": data.get("email"), "username": data.get("login")}

    def extract_email_addresses(self, data: dict[str, Any]) -> list[EmailAddress]:
        email = data.get("email")
        return [EmailAddress(email=email, verified=True, primary=True)] if email else []


provider_classes = [FortyTwoProvider]
