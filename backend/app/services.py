from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from uuid import uuid4

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models, schemas
from .knowledge import search_knowledge_base
from .ml import predict_category
from .priority import detect_priority


def generate_ticket_number() -> str:
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_part = uuid4().hex[:6].upper()
    return f"HD-{date_part}-{unique_part}"


def analyse_issue(db: Session, title: str, description: str, device_type: str | None = None) -> dict:
    category_result = predict_category(title, description)
    priority_result = detect_priority(title, description, category_result["category"])
    query = f"{title} {description} {device_type or ''}"
    suggestions = search_knowledge_base(db, query, category=category_result["category"], limit=3)
    return {
        **category_result,
        "priority": priority_result["priority"],
        "priority_reasons": priority_result["reasons"],
        "suggestions": suggestions,
    }


def create_ticket(db: Session, payload: schemas.TicketCreate) -> models.Ticket:
    values = payload.model_dump()
    if not values.get("category") or not values.get("priority"):
        analysis = analyse_issue(db, payload.title, payload.description, payload.device_type)
        values["category"] = values.get("category") or analysis["category"]
        values["priority"] = values.get("priority") or analysis["priority"]

    ticket = models.Ticket(ticket_number=generate_ticket_number(), **values)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def list_tickets(
    db: Session,
    status: str | None = None,
    priority: str | None = None,
    category: str | None = None,
    search: str | None = None,
    limit: int = 100,
) -> list[models.Ticket]:
    stmt = select(models.Ticket).order_by(models.Ticket.created_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(models.Ticket.status == status)
    if priority:
        stmt = stmt.where(models.Ticket.priority == priority)
    if category:
        stmt = stmt.where(models.Ticket.category == category)
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            models.Ticket.title.ilike(term)
            | models.Ticket.description.ilike(term)
            | models.Ticket.ticket_number.ilike(term)
            | models.Ticket.email.ilike(term)
        )
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


def add_note(db: Session, ticket: models.Ticket, payload: schemas.TicketNoteCreate) -> models.TicketNote:
    note = models.TicketNote(ticket_id=ticket.id, author=payload.author, note=payload.note)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def list_notes(db: Session, ticket_id: int) -> list[models.TicketNote]:
    stmt = (
        select(models.TicketNote)
        .where(models.TicketNote.ticket_id == ticket_id)
        .order_by(models.TicketNote.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def similar_resolved_incidents(db: Session, ticket: models.Ticket, limit: int = 3) -> list[dict]:
    candidates = list(
        db.scalars(
            select(models.Ticket).where(
                models.Ticket.status.in_(["Resolved", "Closed"]),
                models.Ticket.resolution.is_not(None),
                models.Ticket.id != ticket.id,
            )
        ).all()
    )
    if not candidates:
        return []

    target = f"{ticket.title} {ticket.description} {ticket.category}"
    corpus = [f"{c.title} {c.description} {c.category} {c.resolution or ''}" for c in candidates]
    vectorizer = TfidfVectorizer(lowercase=True, ngram_range=(1, 2), stop_words="english")
    matrix = vectorizer.fit_transform(corpus + [target])
    scores = cosine_similarity(matrix[-1], matrix[:-1]).flatten()
    ranked = scores.argsort()[::-1][:limit]
    return [
        {
            "ticket_id": candidates[int(i)].id,
            "ticket_number": candidates[int(i)].ticket_number,
            "title": candidates[int(i)].title,
            "category": candidates[int(i)].category,
            "resolution": candidates[int(i)].resolution or "",
            "similarity": round(float(scores[i]), 4),
        }
        for i in ranked
    ]


def analytics(db: Session) -> dict:
    tickets = list(db.scalars(select(models.Ticket)).all())
    total = len(tickets)

    status_counts = Counter(ticket.status for ticket in tickets)
    priority_counts = Counter(ticket.priority for ticket in tickets)
    category_counts = Counter(ticket.category for ticket in tickets)

    resolved = [ticket for ticket in tickets if ticket.resolved_at is not None]
    today = datetime.now(timezone.utc).date()
    resolved_today = sum(1 for ticket in resolved if ticket.resolved_at and ticket.resolved_at.date() == today)
    durations = [
        (ticket.resolved_at - ticket.created_at).total_seconds() / 60
        for ticket in resolved
        if ticket.resolved_at and ticket.created_at
    ]

    date_counts = Counter(ticket.created_at.date().isoformat() for ticket in tickets)
    per_day = [{"date": date, "count": date_counts[date]} for date in sorted(date_counts)[-14:]]

    normalized_titles = Counter(ticket.title.strip().lower() for ticket in tickets if ticket.title.strip())
    top_problem = normalized_titles.most_common(1)[0][0] if normalized_titles else None
    common_category = category_counts.most_common(1)[0][0] if category_counts else None

    return {
        "total_tickets": total,
        "open_tickets": status_counts.get("Open", 0),
        "in_progress_tickets": status_counts.get("In Progress", 0),
        "waiting_tickets": status_counts.get("Waiting", 0),
        "resolved_tickets": status_counts.get("Resolved", 0),
        "closed_tickets": status_counts.get("Closed", 0),
        "critical_tickets": priority_counts.get("Critical", 0),
        "resolved_today": resolved_today,
        "average_resolution_minutes": round(sum(durations) / len(durations), 2) if durations else None,
        "resolution_percentage": round((len(resolved) / total * 100), 1) if total else 0.0,
        "most_common_category": common_category,
        "top_recurring_problem": top_problem,
        "by_status": dict(status_counts),
        "by_priority": dict(priority_counts),
        "by_category": dict(category_counts),
        "tickets_per_day": per_day,
    }
