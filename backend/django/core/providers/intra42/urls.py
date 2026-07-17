from allauth.socialaccount.providers.oauth2.urls import default_urlpatterns

from .provider import FortyTwoProvider

urlpatterns = default_urlpatterns(FortyTwoProvider)
