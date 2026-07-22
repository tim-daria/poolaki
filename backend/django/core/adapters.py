from urllib.parse import parse_qs, urlparse

from allauth.core.exceptions import ImmediateHttpResponse
from allauth.core.internal import httpkit
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter, SocialLogin
from django.http import HttpRequest, HttpResponseRedirect


class SocialAccountAdapter(DefaultSocialAccountAdapter):  # type: ignore[misc]
    def pre_social_login(self, request: HttpRequest, sociallogin: SocialLogin) -> None:
        super().pre_social_login(request, sociallogin)

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
