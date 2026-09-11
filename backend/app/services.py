from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models, schemas


def generate_ticket_number() -> str:
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_part = uuid4().hex[:6].upper()
    return f"HD-{date_part}-{unique_part}"


def create_ticket(db: Session, payload: schemas.TicketCreate) -> models.Ticket:
    ticket = models.Ticket(
        ticket_number=generate_ticket_number(),
        **payload.model_dump(),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def list_tickets(
    db: Session,
    status: str | None = None,
    priority: str | None = None,
    limit: int = 100,
) -> list[models.Ticket]:
    stmt = select(models.Ticket).order_by(models.Ticket.created_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(models.Ticket.status == status)
    if priority:
        stmt = stmt.where(models.Ticket.priority == priority)
    return list(db.scalars(stmt).all())


def get_ticket(db: Session, ticket_id: int) -> models.Ticket | None:
    return db.get(models.Ticket, ticket_id)


def update_ticket(db: Session, ticket: models.Ticket, payload: schemas.TicketUpdate) -> models.Ticket:
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(ticket, field, value)

    if payload.status == "Resolved" and ticket.resolved_at is None:
        ticket.resolved_at = datetime.now(timezone.utc)
    elif payload.status in {"Open", "In Progress", "Waiting"}:
        ticket.resolved_at = None
        ticket.resolution = None

    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def resolve_ticket(db: Session, ticket: models.Ticket, payload: schemas.TicketResolve) -> models.Ticket:
    ticket.status = "Resolved"
    ticket.resolution = payload.resolution
    ticket.resolved_at = datetime.now(timezone.utc)
    if payload.resolved_by:
        ticket.assigned_to = payload.resolved_by
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def analytics(db: Session) -> dict:
    def count_for_status(status: str) -> int:
        return db.scalar(select(func.count()).select_from(models.Ticket).where(models.Ticket.status == status)) or 0

    total = db.scalar(select(func.count()).select_from(models.Ticket)) or 0
    critical = db.scalar(
        select(func.count()).select_from(models.Ticket).where(models.Ticket.priority == "Critical")
    ) or 0

    today = datetime.now(timezone.utc).date()
    resolved_tickets = list(
        db.scalars(select(models.Ticket).where(models.Ticket.resolved_at.is_not(None))).all()
    )

    resolved_today = sum(1 for ticket in resolved_tickets if ticket.resolved_at and ticket.resolved_at.date() == today)
    durations = [
        (ticket.resolved_at - ticket.created_at).total_seconds() / 60
        for ticket in resolved_tickets
        if ticket.resolved_at and ticket.created_at
    ]

    return {
        "total_tickets": total,
        "open_tickets": count_for_status("Open"),
        "in_progress_tickets": count_for_status("In Progress"),
        "waiting_tickets": count_for_status("Waiting"),
        "resolved_tickets": count_for_status("Resolved"),
        "closed_tickets": count_for_status("Closed"),
        "critical_tickets": critical,
        "resolved_today": resolved_today,
        "average_resolution_minutes": round(sum(durations) / len(durations), 2) if durations else None,
    }
