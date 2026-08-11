# Entry point for the context_builder: when and where
# Receive request -> call service -> return response

from fastapi import APIRouter # To group endpoints

from app.models.context import (ContextRequest, ContextResponse) # I/O endpoint

from app.services.context_builder import ContextBuilder
from app.services.leo_retriever import LeoRetriever


router = APIRouter(prefix="/api/v1", tags=["context"])

context_builder = ContextBuilder()
retriever = LeoRetriever()

@router.post("/context", response_model=ContextResponse)

async def build_context(request: ContextRequest): # It's async because retriever.get_context makes await to simluate a call to an exxternal API

    # 1. Simulate retrieval
    retrieval_result = await retriever.get_context(user_id=request.user_id, question=request.question)

    # 2. Transform data into LLM context
    context = context_builder.build_context(retrieval_result)

    # 3. Return context created
    return ContextResponse(context=context)