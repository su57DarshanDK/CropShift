from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.ivr import IVRRequest, IVRResponse
from app.ivr.service import generate_ivr_response

router = APIRouter()

@router.post("/recommendation", response_model=IVRResponse)
def get_ivr_recommendation(
    payload: IVRRequest,
    db: Session = Depends(get_db)
):
    res = generate_ivr_response(db, payload.farmer_id)
    return res
