from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models

# Demo tickets are identified by their ticket number, not by email address.
# This keeps demo maintenance completely separate from real/user-submitted tickets.
DEMO_TICKETS = [
    {
        "name": "Ava Demo",
        "email": "ava.demo@example.com",
        "title": "Wi-Fi keeps disconnecting",
        "description": "My laptop disconnects from Wi-Fi every few minutes and I cannot stay in video calls.",
        "device_type": "Windows laptop",
        "category": "Network",
        "priority": "High",
        "status": "In Progress",
        "assigned_to": "Alex Morgan",
    },
    {
        "name": "Noah Demo",
        "email": "noah.demo@example.com",
        "title": "Suspicious email received",
        "description": "I received a suspicious email asking me to verify my password. I did not click the link.",
        "device_type": "Windows laptop",
        "category": "Security",
        "priority": "High",
        "status": "Open",
        "assigned_to": None,
    },
    {
        "name": "Mia Demo",
        "email": "mia.demo@example.com",
        "title": "Outlook will not open",
        "description": "Outlook closes during startup after this morning's update.",
        "device_type": "Windows laptop",
        "category": "Software",
        "priority": "Medium",
        "status": "Resolved",
        "assigned_to": "Jordan Lee",
        "resolution": "Started Outlook in safe mode, disabled a failing add-in, then updated Office.",
    },
    {
        "name": "Leo Demo",
        "email": "leo.demo@example.com",
        "title": "Account is locked",
        "description": "My account is locked after several sign-in attempts and I cannot work.",
        "device_type": "Windows laptop",
        "category": "Account",
        "priority": "High",
        "status": "Resolved",
        "assigned_to": "Alex Morgan",
        "resolution": "Verified identity, unlocked the account and removed an outdated saved password.",
    },
    {
        "name": "Zoe Demo",
        "email": "zoe.demo@example.com",
        "title": "External monitor not detected",
        "description": "My second monitor has no signal through the docking station.",
        "device_type": "Windows laptop",
        "category": "Hardware",
        "priority": "Medium",
        "status": "Waiting",
        "assigned_to": "Jordan Lee",
    },
]


def _demo_ticket_number(index: int) -> str:
    return f"DEMO-{index + 1:04d}"


def seed_demo_tickets(db: Session) -> int:
    """Add missing demo tickets and repair legacy demo emails safely.

    Older builds used ``@demo.helpdesk.local`` addresses. Those values can fail
    strict email serialization and make the whole technician queue appear empty.
    We repair only DEMO-* rows and never modify user-submitted HD-* tickets.
    """
    existing_tickets = list(
        db.scalars(select(models.Ticket).where(models.Ticket.ticket_number.like("DEMO-%"))).all()
    )
    existing = {ticket.ticket_number: ticket for ticket in existing_tickets}

    now = datetime.now(timezone.utc)
    added = 0
    changed = False

    for index, item in enumerate(DEMO_TICKETS):
        ticket_number = _demo_ticket_number(index)
        current = existing.get(ticket_number)

        if current is not None:
            # Repair legacy invalid demo addresses without resetting technician work.
            if current.email != item["email"] and current.email.endswith("@demo.helpdesk.local"):
                current.email = item["email"]
                changed = True
            continue

        payload = dict(item)
        resolution = payload.pop("resolution", None)
        status = payload.pop("status")
        ticket = models.Ticket(
            ticket_number=ticket_number,
            created_at=now - timedelta(hours=(index + 1) * 4),
            resolved_at=(now - timedelta(hours=index + 1)) if status == "Resolved" else None,
            resolution=resolution,
            status=status,
            **payload,
        )
        db.add(ticket)
        added += 1
        changed = True

    if changed:
        db.commit()
    return added


def reset_demo_tickets(db: Session) -> int:
    """Reset DEMO-* tickets only; user-created HD-* tickets are preserved."""
    tickets = list(
        db.scalars(select(models.Ticket).where(models.Ticket.ticket_number.like("DEMO-%"))).all()
    )
    count = len(tickets)
    for ticket in tickets:
        db.delete(ticket)
    db.commit()
    return count
