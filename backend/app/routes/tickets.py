from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import schemas, services
from ..database import get_db

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.post("", response_model=schemas.TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: schemas.TicketCreate, db: Session = Depends(get_db)):
    return services.create_ticket(db, payload)


@router.get("", response_model=list[schemas.TicketRead])
def get_tickets(
    status_filter: str | None = Query(default=None, alias="status"),
    priority: str | None = Query(default=None),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return services.list_tickets(
        db,
        status=status_filter,
        priority=priority,
        category=category,
        search=search,
        limit=limit,
    )


@router.get("/{ticket_id}", response_model=schemas.TicketRead)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = services.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=schemas.TicketRead)
def update_ticket(ticket_id: int, payload: schemas.TicketUpdate, db: Session = Depends(get_db)):
    ticket = services.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return services.update_ticket(db, ticket, payload)


@router.post("/{ticket_id}/resolve", response_model=schemas.TicketRead)
def resolve_ticket(ticket_id: int, payload: schemas.TicketResolve, db: Session = Depends(get_db)):
    ticket = services.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return services.resolve_ticket(db, ticket, payload)


@router.post("/{ticket_id}/notes", response_model=schemas.TicketNoteRead, status_code=status.HTTP_201_CREATED)
def add_note(ticket_id: int, payload: schemas.TicketNoteCreate, db: Session = Depends(get_db)):
    ticket = services.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return services.add_note(db, ticket, payload)


@router.get("/{ticket_id}/notes", response_model=list[schemas.TicketNoteRead])
def get_notes(ticket_id: int, db: Session = Depends(get_db)):
    ticket = services.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return services.list_notes(db, ticket_id)


@router.get("/{ticket_id}/similar", response_model=list[schemas.SimilarIncidentRead])
def get_similar_incidents(ticket_id: int, db: Session = Depends(get_db)):
    ticket = services.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return services.similar_resolved_incidents(db, ticket)
