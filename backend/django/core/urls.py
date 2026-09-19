from django.urls import path

from core.views.invitation import (
    AcceptInvitationView,
    CancelInvitationView,
    DeclineInvitationView,
    InvitationListCreateView,
    MyInvitationsView,
)
from core.views.notification import (
    MarkAllNotificationsReadView,
    NotificationListView,
    UnreadNotificationCountView,
)
from core.views.organization import (
    OrganizationBalanceView,
    OrganizationLeaveView,
    OrganizationListCreateView,
    OrganizationMemberRemoveView,
    OrganizationMembersView,
    OrganizationUpdateView,
    SetInitialBalanceView,
)
from core.views.transaction import (
    TransactionGetDeleteView,
    TransactionListCreateView,
)
from core.views.utils import csrf

urlpatterns = [
    path("csrf/", csrf),
    path(
        "organizations/",
        OrganizationListCreateView.as_view(),
        name="organization-list-create",
    ),
    path(
        "organizations/<int:org_id>/",
        OrganizationUpdateView.as_view(),
        name="organization-update",
    ),
    path(
        "organizations/<int:org_id>/leave/",
        OrganizationLeaveView.as_view(),
        name="organization-leave",
    ),
    path(
        "organizations/<int:org_id>/members/",
        OrganizationMembersView.as_view(),
        name="organization-members",
    ),
    path(
        "organizations/<int:org_id>/members/<int:user_id>/",
        OrganizationMemberRemoveView.as_view(),
        name="organization-remove-member",
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
        "organizations/<int:org_id>/transactions/",
        TransactionListCreateView.as_view(),
        name="transaction-list-create",
    ),
    path(
        "organizations/<int:org_id>/transactions/<int:transaction_id>/",
        TransactionGetDeleteView.as_view(),
        name="transaction-get-delete",
    ),
    path(
        "organizations/<int:org_id>/balance/",
        OrganizationBalanceView.as_view(),
        name="organization-balance",
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
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path(
        "notifications/unread-count/",
        UnreadNotificationCountView.as_view(),
        name="notification-unread-count",
    ),
    path(
        "notifications/clear-all/",
        MarkAllNotificationsReadView.as_view(),
        name="notification-clear-all",
    ),
]
