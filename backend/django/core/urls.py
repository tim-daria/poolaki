from django.urls import path

from core.views import SetInitialBalanceView, csrf

urlpatterns = [
    path("csrf/", csrf),
    path(
        "organizations/personal/initial-balance/",
        SetInitialBalanceView.as_view(),
        name="set_initial_balance",
    ),
]
