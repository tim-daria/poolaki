from typing import Any
from urllib.parse import parse_qs, urlparse

from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.utils import filter_users_by_email, filter_users_by_username
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.core.internal import httpkit
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialLogin
from django.http import HttpRequest, HttpResponseRedirect


class AccountAdapter(DefaultAccountAdapter):  # type: ignore[misc]
    """Distinguishes "no such account" from "wrong password" on login."""

    error_messages = {
        **DefaultAccountAdapter.error_messages,
        "user_not_found": "No account exists with that username or email.",
    }

    def authentication_failed(self, request: HttpRequest, **credentials: Any) -> None:
        super().authentication_failed(request, **credentials)

        username = credentials.get("username")
        email = credentials.get("email")
        if username:
            exists = filter_users_by_username(username).exists()
        elif email:
            exists = bool(filter_users_by_email(email))
        else:
            return

        if not exists:
            raise self.validation_error("user_not_found")


class SocialAccountAdapter(DefaultSocialAccountAdapter):  # type: ignore[misc]
    def pre_social_login(self, request: HttpRequest, sociallogin: SocialLogin) -> None:
        super().pre_social_login(request, sociallogin)

        if sociallogin.state.get("process") == "connect":
            return

        next_url = sociallogin.state.get("next", "")
        flow = parse_qs(urlparse(next_url).query).get("flow", ["login"])[0]

        if flow == "login" and not sociallogin.is_existing:
            login_error_url = (
                httpkit.get_frontend_url(request, "socialaccount_login_error") or "/login"
            )
            login_error_url = httpkit.add_query_params(
                login_error_url,
                {
                    "error": "account_not_found",
                    "error_process": "login",
                },
            )
            raise ImmediateHttpResponse(HttpResponseRedirect(login_error_url))
