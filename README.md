# AI Helpdesk Copilot

Portfolio Project 1 - Milestone 1: **Database + FastAPI ticket system**.

This milestone deliberately does **not** add AI yet. The roadmap says to make the core ticket workflow reliable first, then add classification, priority rules, knowledge retrieval and the technician dashboard.

## What works now

- PostgreSQL-ready database design
- `tickets`, `ticket_notes`, and `knowledge_base` tables
- Create a support ticket
- List tickets
- Filter tickets by status or priority
- Read one ticket
- Update a ticket
- Resolve a ticket and store `resolved_at` + resolution
- Basic operational analytics
- Input validation
- Automated tests
- Swagger/OpenAPI documentation

## API endpoints

- `POST /tickets`
- `GET /tickets`
- `GET /tickets/{id}`
- `PATCH /tickets/{id}`
- `POST /tickets/{id}/resolve`
- `GET /analytics`
- `GET /health`

## Fastest way to run it

### Option A - Docker + PostgreSQL

```bash
docker compose up --build
```

Then open:

- API: http://localhost:8000
- Interactive API docs: http://localhost:8000/docs

### Option B - Python locally

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and make sure PostgreSQL is running.
4. Run:

```bash
uvicorn backend.app.main:app --reload
```

## Example ticket

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "title": "Wi-Fi keeps disconnecting",
  "description": "My laptop disconnects from Wi-Fi every few minutes while I am working.",
  "device_type": "Windows laptop",
  "category": "Network",
  "priority": "High"
}
```

## Run tests

```bash
pytest -q
```

## Next milestone

Build the customer-facing frontend and connect it to these APIs. After the normal ticket flow works end to end, add the ML classifier and priority rules.
