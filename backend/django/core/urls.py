from django.urls import path

from core.views import SetInitialBalanceView, secret, testPage

urlpatterns = [
    path("secret/", secret),
    path("test/", testPage),
    path("organizations/personal/initial-balance/", SetInitialBalanceView.as_view()),
]
