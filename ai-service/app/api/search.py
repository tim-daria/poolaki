from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_vector_search_service

router = APIRouter(prefix="/search", tags=["Vector Search"])

@router.post("/")
async def search_vectors(query: str, service = Depends(get_vector_search_service)):
    try:
        return await service.search(query)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error during vector search")