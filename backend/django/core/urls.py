from django.urls import path

from core.views import OrganizationCreateView, SetInitialBalanceView, csrf

urlpatterns = [
    path("csrf/", csrf),
    path("organizations/", OrganizationCreateView.as_view(), name="create_shared_organization"),
    path("organizations/personal/initial-balance/", SetInitialBalanceView.as_view()),
]
