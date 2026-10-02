from typing import Any, Optional
from pydantic import BaseModel, Field


class ChunkCreate(BaseModel):
    document_id: str
    content: str
    embedding: list[float]
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChunkUpdate(BaseModel):
    content: Optional[str] = None
    embedding: Optional[list[float]] = None


class ChunkResponse(BaseModel):
    id: str
    document_id: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    similarity: Optional[float] = None