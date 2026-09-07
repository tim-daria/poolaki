from fastapi import APIRouter, Depends

from app.services.llm import LLMService
from models.chat import ChatRequest, ChatResponse, ChatMetadata


router = APIRouter(prefix="/api/v1", tags=["Chat"])


def get_llm_service() -> LLMService:
    from app.main import llm_service

    return llm_service


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    llm_service: LLMService = Depends(get_llm_service),
) -> ChatResponse:
    answer, intent = await llm_service.generate_response(
        user_id=payload.user_id,
        organization_id=payload.organization_id,
        question=payload.question,
    )

    return ChatResponse(answer=answer, metadata=ChatMetadata(intent=intent))