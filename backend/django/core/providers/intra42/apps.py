from allauth.socialaccount.apps import SocialAccountConfig


class Intra42Config(SocialAccountConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core.providers.intra42"
    label = "intra42"
