from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..demo_data import reset_demo_tickets, seed_demo_tickets

router = APIRouter(prefix="/demo", tags=["Demo"])


@router.post("/seed")
def seed_demo(db: Session = Depends(get_db)):
    added = seed_demo_tickets(db)
    return {"status": "ok", "added": added}


@router.post("/reset")
def reset_demo(db: Session = Depends(get_db)):
    removed = reset_demo_tickets(db)
    added = seed_demo_tickets(db)
    return {"status": "ok", "removed": removed, "added": added}
