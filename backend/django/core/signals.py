from allauth.account.signals import user_signed_up
from django.dispatch import receiver
from django.http import HttpRequest

from core.models import User
from core.services.registration import create_personal_organization


@receiver(user_signed_up)
def handle_user_signed_up(request: HttpRequest, user: User, **kwargs: object) -> None:
    create_personal_organization(user)

    if "sociallogin" not in kwargs:
        return

    request.session["needs_initial_balance"] = True
    request.session.modified = True
