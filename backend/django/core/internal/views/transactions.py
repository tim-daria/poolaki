from typing import Any

from core.internal.views.base import AiOrgView
from core.models import Organization
from core.serializers import AiTransactionsResponseSerializer
from core.services.transaction import get_org_ai_transactions


class AiTransactionsView(AiOrgView):
    """Static transaction context: all income/expense transactions of the
    last 3 calendar months (inclusive), newest first. Contribution/withdraw
    are goal transfers and are excluded."""

    response_serializer = AiTransactionsResponseSerializer

    def build_payload(self, org: Organization, data: dict[str, Any]) -> dict[str, Any]:
        return {"transactions": get_org_ai_transactions(org)}
