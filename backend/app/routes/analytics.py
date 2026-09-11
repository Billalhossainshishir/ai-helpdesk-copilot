from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas, services
from ..database import get_db

router = APIRouter(tags=["Analytics"])


@router.get("/analytics", response_model=schemas.AnalyticsRead)
def get_analytics(db: Session = Depends(get_db)):
    return services.analytics(db)
