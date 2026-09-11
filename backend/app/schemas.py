from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

TicketStatus = Literal["Open", "In Progress", "Waiting", "Resolved", "Closed"]
TicketPriority = Literal["Low", "Medium", "High", "Critical"]


class TicketCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    device_type: str | None = Field(default=None, max_length=100)
    category: str = Field(default="Other", max_length=50)
    priority: TicketPriority = "Medium"


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, min_length=10, max_length=5000)
    device_type: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=50)
    priority: TicketPriority | None = None
    status: TicketStatus | None = None
    assigned_to: str | None = Field(default=None, max_length=120)


class TicketResolve(BaseModel):
    resolution: str = Field(min_length=3, max_length=5000)
    resolved_by: str | None = Field(default=None, max_length=120)


class TicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_number: str
    name: str
    email: EmailStr
    title: str
    description: str
    device_type: str | None
    category: str
    priority: str
    status: str
    assigned_to: str | None
    created_at: datetime
    resolved_at: datetime | None
    resolution: str | None


class AnalyticsRead(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    waiting_tickets: int
    resolved_tickets: int
    closed_tickets: int
    critical_tickets: int
    resolved_today: int
    average_resolution_minutes: float | None
