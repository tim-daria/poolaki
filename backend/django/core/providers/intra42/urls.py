from django.urls import path

from core.providers.intra42.views import oauth2_callback

urlpatterns = [
    path(
        "callback/",
        oauth2_callback,
        name="intra42_callback",
    ),
]
