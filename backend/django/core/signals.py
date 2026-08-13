from allauth.account.signals import user_logged_in, user_signed_up
from django.dispatch import receiver
from django.http import HttpRequest

from core.models import Membership, User
from core.services.registration import create_personal_organization


@receiver(user_signed_up)
def handle_user_signed_up(request: HttpRequest, user: User, **kwargs: object) -> None:
    create_personal_organization(user)

    # if "sociallogin" not in kwargs:
    #     return
    # request.session["needs_initial_balance"] = True
    # request.session.modified = True


@receiver(user_logged_in)
def set_default_organization(
    sender: type[User], request: HttpRequest, user: User, **kwargs: object
) -> None:
    personal_membership = Membership.objects.filter(user=user, org__is_personal=True).first()
    if personal_membership:
        request.session["current_organization_id"] = personal_membership.org_id
