# Architecture

```mermaid
flowchart LR
    A[Customer Portal] --> B[FastAPI]
    B --> C[TF-IDF + Logistic Regression]
    B --> D[Priority Rules]
    B --> E[Knowledge Retrieval]
    E --> F[(Knowledge Base)]
    B --> G[(PostgreSQL / SQLite)]
    H[Technician Dashboard] --> B
    B --> I[Similar Incident Search]
    I --> G
    B --> J[Analytics]
    J --> H
```

The application uses deterministic business rules for priority and classical ML for category classification. Knowledge and past-incident retrieval use TF-IDF cosine similarity so the evidence can be surfaced directly in the UI.
