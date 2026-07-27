from allauth.socialaccount.apps import SocialAccountConfig


class Intra42Config(SocialAccountConfig):
    name = "core.providers.intra42"
    label = "intra42"
