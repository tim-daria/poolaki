from core.models import Membership, Notification, NotificationType, Organization, User


def notify_users(
    user_ids: list[int],
    ntype: NotificationType,
    payload: dict[str, object],
    *,
    org: Organization | None = None,
) -> None:
    if not user_ids:
        return
    Notification.objects.bulk_create(
        Notification(user_id=uid, type=ntype, org=org, payload=payload) for uid in user_ids
    )


def notify_org_members_except(
    org: Organization,
    actor: User,
    ntype: NotificationType,
    payload: dict[str, object],
) -> None:
    """Notify every member of the organization except the actor."""
    notify_users(
        list(
            Membership.objects.filter(org=org).exclude(user=actor).values_list("user_id", flat=True)
        ),
        ntype,
        payload,
        org=org,
    )
