from django.urls import path

from core.views import (
    CancelInvitationView,
    InvitationCreateView,
    OrganizationListCreateView,
    SetInitialBalanceView,
    SwitchOrganizationView,
    csrf,
)

urlpatterns = [
    path("csrf/", csrf),
    path("organizations/", OrganizationListCreateView.as_view(), name="organization-list-create"),
    path(
        "organizations/<int:org_id>/invitations/",
        InvitationCreateView.as_view(),
        name="invitation-create",
    ),
    path(
        "organizations/<int:org_id>/invitations/<int:invitation_id>/cancel",
        CancelInvitationView.as_view(),
        name="invitation-cancel",
    ),
    path(
        "organizations/personal/initial-balance/",
        SetInitialBalanceView.as_view(),
        name="set_initial_balance",
    ),
    path(
        "organizations/<int:org_id>/select/",
        SwitchOrganizationView.as_view(),
        name="switch_organization",
    ),
]
