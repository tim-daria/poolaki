from django.urls import path

from core.views.invitation import (
    AcceptInvitationView,
    CancelInvitationView,
    DeclineInvitationView,
    InvitationListCreateView,
    MyInvitationsView,
)
from core.views.organization import (
    OrganizationListCreateView,
    OrganizationMembersView,
    SetInitialBalanceView,
)
from core.views.utils import csrf

urlpatterns = [
    path("csrf/", csrf),
    path("organizations/", OrganizationListCreateView.as_view(), name="organization-list-create"),
    path(
        "organizations/<int:org_id>/members/",
        OrganizationMembersView.as_view(),
        name="organization-members",
    ),
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
        name="set-initial-balance",
    ),
    path(
        "invitations/<int:invitation_id>/accept/",
        AcceptInvitationView.as_view(),
        name="invitation-accept",
    ),
    path(
        "invitations/<int:invitation_id>/decline/",
        DeclineInvitationView.as_view(),
        name="invitation-decline",
    ),
    path(
        "invitations/my/",
        MyInvitationsView.as_view(),
        name="my-invitations",
    ),
]
