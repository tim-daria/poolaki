from django.urls import path

from core.views import (
    CancelInvitationView,
    InvitationListCreateView,
    OrganizationListCreateView,
    SetInitialBalanceView,
    csrf,
)

urlpatterns = [
    path("csrf/", csrf),
    path("organizations/", OrganizationListCreateView.as_view(), name="organization-list-create"),
    path(
        "organizations/<int:org_id>/invitations/",
        InvitationListCreateView.as_view(),
        name="invitation-list-create",
    ),
    path(
        "organizations/<int:org_id>/invitations/<int:invitation_id>/cancel/",
        CancelInvitationView.as_view(),
        name="invitation-cancel",
    ),
    path(
        "organizations/personal/initial-balance/",
        SetInitialBalanceView.as_view(),
        name="set_initial_balance",
    ),
    # path(
    #     "organizations/<int:org_id>/select/",
    #     SwitchOrganizationView.as_view(),
    #     name="switch_organization",
    # ),
]
