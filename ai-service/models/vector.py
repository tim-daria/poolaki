from typing import Any

from pydantic import BaseModel, Field


class ChunkCreate(BaseModel):
    document_id: str
    content: str
    embedding: list[float]
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChunkUpdate(BaseModel):
    content: str | None = None
    embedding: list[float] | None = None


class ChunkResponse(BaseModel):
    id: str
    document_id: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    similarity: float | None = None