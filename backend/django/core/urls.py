from django.urls import path

from core.views import secret, testPage

urlpatterns = [
    path("secret/", secret),
    path("test/", testPage),
]
