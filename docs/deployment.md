# Deployment Notes

The repository includes a deployment path for a single FastAPI service with PostgreSQL. It remains a portfolio prototype and requires the controls described below before use with real support data.

## Example prototype configuration

Set environment variables:

```text
APP_NAME=AI Helpdesk Copilot
DATABASE_URL=<hosted PostgreSQL SQLAlchemy URL>
CORS_ORIGINS=<your public application origin>
AUTO_SEED_DEMO=true
```

Run the web service with:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

A Dockerfile and Docker Compose configuration are included. The public recruiter demo should keep only synthetic/demo data and should not be used for real confidential support tickets without authentication, access control, secure file handling and production security hardening.
