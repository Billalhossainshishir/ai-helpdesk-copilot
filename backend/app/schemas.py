from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

TicketStatus = Literal["Open", "In Progress", "Waiting", "Resolved", "Closed"]
TicketPriority = Literal["Low", "Medium", "High", "Critical"]


class IssueText(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    device_type: str | None = Field(default=None, max_length=100)


class CategoryPrediction(BaseModel):
    category: str
    confidence: float
    model: str


class PriorityPrediction(BaseModel):
    priority: TicketPriority
    reasons: list[str]


class KnowledgeArticleRead(BaseModel):
    id: int
    title: str
    category: str
    problem: str
    solution: str
    keywords: str
    similarity: float


class IssueAnalysis(BaseModel):
    category: str
    confidence: float
    model: str
    priority: TicketPriority
    priority_reasons: list[str]
    suggestions: list[KnowledgeArticleRead]


class TicketCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    device_type: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=50)
    priority: TicketPriority | None = None


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
    # Output uses a plain string so legacy database rows can never break the whole ticket list.
    # New ticket input is still validated by TicketCreate.email above.
    email: str
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


class TicketNoteCreate(BaseModel):
    author: str = Field(min_length=2, max_length=120)
    note: str = Field(min_length=2, max_length=5000)


class TicketNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    author: str
    note: str
    created_at: datetime


class SimilarIncidentRead(BaseModel):
    ticket_id: int
    ticket_number: str
    title: str
    category: str
    resolution: str
    similarity: float


class DailyCount(BaseModel):
    date: str
    count: int


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
    resolution_percentage: float
    most_common_category: str | None
    top_recurring_problem: str | None
    by_status: dict[str, int]
    by_priority: dict[str, int]
    by_category: dict[str, int]
    tickets_per_day: list[DailyCount]
