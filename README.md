# AI Helpdesk Copilot

A live portfolio project that is being built in production-style milestones. The final system will classify IT issues, estimate priority, retrieve troubleshooting guidance, manage support tickets and show operational analytics.

## Current milestone - Customer Support Portal + FastAPI Ticketing

The project now has a real customer-facing interface connected to the working ticket-management API.

### What works now

- Professional responsive **Report IT Problem** webpage
- Demo issue buttons for fast recruiter testing
- Live API health indicator
- Client-side form validation and API error handling
- Support ticket creation from the webpage
- Success receipt with generated ticket number
- PostgreSQL-ready database design
- `tickets`, `ticket_notes`, and `knowledge_base` tables
- Create, list, read, update and resolve support tickets
- Filter tickets by status or priority
- Basic operational analytics
- Swagger/OpenAPI documentation
- Automated backend + frontend-serving tests

> AI classification is intentionally **not faked** in this milestone. New customer tickets currently use the backend defaults `Other` and `Medium`. The next milestone will add the real ticket classifier and priority rules.

## Run locally without Docker

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

Then open:

- Customer portal: http://127.0.0.1:8000/
- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

Without a `.env` file, the app uses a local SQLite database automatically for easy development.

## Docker + PostgreSQL

When Docker Desktop is installed:

```bash
docker compose up --build
```

Then open http://localhost:8000/.

## API endpoints

- `POST /tickets`
- `GET /tickets`
- `GET /tickets/{id}`
- `PATCH /tickets/{id}`
- `POST /tickets/{id}/resolve`
- `GET /analytics`
- `GET /health`

## Example ticket payload

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "title": "Wi-Fi keeps disconnecting",
  "description": "My laptop disconnects from Wi-Fi every few minutes while I am working.",
  "device_type": "Windows laptop"
}
```

## Run tests

```bash
pytest -q
```

## Build order

1. ✅ Database + FastAPI ticket system
2. ✅ Customer-facing support portal
3. ⏭️ ML ticket classifier
4. Priority rules
5. Troubleshooting knowledge base
6. Retrieval / RAG-style search
7. Technician dashboard
8. Similar past incidents
9. Analytics expansion
10. Production deployment + portfolio integration
