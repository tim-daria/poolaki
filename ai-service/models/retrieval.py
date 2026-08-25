from typing import Any

from pydantic import BaseModel, Field


class RetrievalRequest(BaseModel):
    user_id: str
    organization_id: str
    question: str
    intent: str
    top_k: int = Field(default=5, ge=1)


class RetrievedItem(BaseModel):
    type: str
    content: str
    source: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class CombinedRetrievalResult(BaseModel):
    items: list[RetrievedItem] = Field(default_factory=list)
