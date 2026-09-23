from fastapi import APIRouter, Depends, HTTPException, status

from app.clients.llm import LLMClientError
from app.services.llm import LLMService
from models.chat import ChatMetadata, ChatRequest, ChatResponse

router = APIRouter(prefix="/api/v1", tags=["Chat"])


def get_llm_service() -> LLMService:
    from app.main import llm_service

    return llm_service


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    llm_service: LLMService = Depends(get_llm_service),
) -> ChatResponse:
    try:
        answer, intent = await llm_service.generate_response(
        user_id=payload.user_id,
        organization_id=payload.organization_id,
        question=payload.question,
        )
    except LLMClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM service temporarily unavailable",
        ) from exc

    return ChatResponse(answer=answer, metadata=ChatMetadata(intent=intent))