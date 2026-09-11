# AI Helpdesk Copilot

A live portfolio project that demonstrates an end-to-end IT support workflow: customer issue submission, ML category classification, transparent priority detection, troubleshooting retrieval, ticket management, technician notes, similar-incident search and operational analytics.

## Live recruiter flow

**Describe issue → Analyse issue → ML category prediction → Priority rules → Top 3 troubleshooting matches → Create ticket → Technician dashboard → Assign / note / resolve → Analytics update**

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** PostgreSQL in Docker; SQLite fallback for quick local development
- **Machine learning:** scikit-learn, TF-IDF, Logistic Regression
- **Retrieval:** TF-IDF cosine similarity over the knowledge base and resolved tickets
- **Frontend:** HTML, CSS, JavaScript
- **Charts:** Chart.js
- **Testing:** pytest + FastAPI TestClient
- **Containerisation:** Docker / Docker Compose

## Features

### Customer portal
- No login required for the portfolio demo
- Four one-click sample issues
- `Analyse issue` before ticket creation
- ML category prediction with confidence
- Explainable Low / Medium / High / Critical priority rules
- Top 3 knowledge-base troubleshooting suggestions with visible retrieval similarity
- Real ticket creation with generated helpdesk number
- The exact requester name and email entered in the form are stored and shown in the AI triage, ticket receipt and technician queue

### Technician dashboard
- KPI cards: open, critical, resolved today, average resolution time, resolution rate
- Category, priority and daily-volume charts
- Search and filters for status, priority and category
- Assignment and status management
- Internal technician notes
- Resolution workflow with `resolved_at`
- Similar resolved incidents using TF-IDF similarity
- Live ticket sync: newly submitted reports appear automatically without manually reloading the page
- Resettable demo ticket data that never deletes user-submitted tickets
- Backward-compatible handling for legacy demo rows so one bad record cannot blank the entire queue

### API
- `POST /analyse-issue`
- `POST /predict-category`
- `POST /predict-priority`
- `POST /suggest-solution`
- `POST /tickets`
- `GET /tickets`
- `GET /tickets/{id}`
- `PATCH /tickets/{id}`
- `POST /tickets/{id}/notes`
- `GET /tickets/{id}/notes`
- `GET /tickets/{id}/similar`
- `POST /tickets/{id}/resolve`
- `GET /analytics`
- `POST /demo/seed`
- `POST /demo/reset`
- `GET /health`

Interactive OpenAPI documentation is available at `/docs` while the app is running.

## Run locally without Docker

From the repository root on Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

Open:

- Customer portal: http://127.0.0.1:8000/
- Technician dashboard: http://127.0.0.1:8000/technician
- API docs: http://127.0.0.1:8000/docs

The default local database is SQLite. The app automatically loads the ML model, seeds 70 troubleshooting articles, and adds a small resettable demo ticket set.

## Dashboard reliability notes

- Demo tickets are identified by `DEMO-*` ticket numbers, not by email domains.
- Existing older demo rows are repaired automatically on startup; you do **not** need to delete `helpdesk.db`.
- New user tickets use `HD-*` numbers and are never removed by **Reset demo data**.
- The technician page refreshes automatically every 5 seconds and also receives same-browser ticket-created notifications for near-immediate updates.
- Ticket list and analytics load independently, so a problem in one panel no longer blanks the entire dashboard.

## Run with Docker + PostgreSQL

```bash
docker compose up --build
```

Open http://localhost:8000/.

## Train the classifier

```bash
python scripts/train_classifier.py
```

The training file contains **490 synthetic portfolio-safe IT support examples** across:

- Network
- Hardware
- Software
- Account
- Email
- Security
- Other

The evaluation artifacts are written to `models/model_metrics.json` and `models/confusion_matrix.csv`. The synthetic test split is intentionally easy and balanced; its score demonstrates that the code path is working, **not** real-world production accuracy.

## Run tests

```bash
pytest -q
```

Current suite: **25 automated tests** covering ticket CRUD, auto-triage, classifier output, priority rules, knowledge retrieval, notes, similar incidents, analytics and both frontend pages.

## Repository structure

```text
ai-helpdesk-copilot/
├── backend/
│   └── app/
│       ├── routes/
│       ├── ml.py
│       ├── priority.py
│       ├── knowledge.py
│       ├── demo_data.py
│       ├── models.py
│       ├── schemas.py
│       └── services.py
├── data/
│   ├── training_tickets.csv
│   └── knowledge_base.json
├── docs/
│   ├── architecture.png
│   ├── architecture.md
│   ├── case-study.md
│   ├── database-schema.md
│   └── model-evaluation.md
├── frontend/
│   ├── index.html
│   ├── technician.html
│   ├── css/
│   └── js/
├── models/
│   ├── ticket_classifier.joblib
│   ├── model_metrics.json
│   └── confusion_matrix.csv
├── screenshots/
├── scripts/
│   └── train_classifier.py
├── tests/
├── docker-compose.yml
├── requirements.txt
└── README.md
```

## Design decisions

1. **CRUD before AI:** the ticket workflow remains useful even if the model is unavailable.
2. **Classical ML rather than a fake chatbot:** TF-IDF + Logistic Regression gives a reproducible, explainable portfolio baseline.
3. **Transparent priority rules:** priority is a business rule, not a black-box probability.
4. **Visible retrieval evidence:** troubleshooting suggestions show what knowledge entries were matched.
5. **Privacy-safe demo:** synthetic ticket data and support articles only.
6. **No recruiter login:** the primary interaction is obvious within seconds.

## Portfolio summary

Built an AI-assisted IT helpdesk using Python, FastAPI, PostgreSQL and scikit-learn that classifies support tickets, applies transparent priority rules, retrieves troubleshooting guidance, manages technician workflows, searches similar past incidents and provides operational analytics through a live web dashboard.
