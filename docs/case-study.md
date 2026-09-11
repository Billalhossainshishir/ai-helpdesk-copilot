# Case Study — AI Helpdesk Copilot

## Problem

A service desk receives unstructured issue descriptions. Staff need to quickly understand what type of incident it is, how urgent it may be, what troubleshooting guidance is relevant, and how similar issues were resolved previously.

## Solution

AI Helpdesk Copilot combines a conventional ticket-management API with a small, reproducible ML pipeline and transparent operational rules.

A customer describes an issue. The system predicts one of seven categories using TF-IDF + Logistic Regression, applies explainable priority rules, retrieves the three most relevant knowledge articles, and creates a ticket. A technician can then assign the incident, change status, add notes, inspect similar resolved tickets, record a resolution and see the effect in the analytics dashboard.

## Why this design

- Category classification is suitable for supervised text ML.
- Priority is kept rule-based because operational impact should be explainable and controllable.
- Retrieval is deliberately simple TF-IDF cosine similarity so a reviewer can understand exactly why guidance was returned.
- The demo is safe: all supplied data is synthetic and no authentication is required for the basic recruiter flow.

## What this project demonstrates

- FastAPI API design and validation
- SQLAlchemy data modelling
- PostgreSQL-ready persistence
- scikit-learn model training and serving
- Explainable decision rules
- Information retrieval
- Frontend/backend integration
- Technician workflow design
- Operational analytics
- Automated testing
- Dockerised deployment path
