from core.models import Notification, NotificationType, Organization


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
