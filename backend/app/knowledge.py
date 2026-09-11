from __future__ import annotations

import json
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models

PROJECT_ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_PATH = PROJECT_ROOT / "data" / "knowledge_base.json"


def seed_knowledge_base(db: Session) -> int:
    existing = db.scalar(select(models.KnowledgeBaseArticle.id).limit(1))
    if existing is not None:
        return 0

    records = json.loads(KNOWLEDGE_PATH.read_text(encoding="utf-8"))
    for record in records:
        db.add(
            models.KnowledgeBaseArticle(
                title=record["title"],
                category=record["category"],
                problem=record["problem"],
                solution=record["solution"],
                keywords=record["keywords"],
            )
        )
    db.commit()
    return len(records)


def search_knowledge_base(
    db: Session,
    query: str,
    category: str | None = None,
    limit: int = 3,
) -> list[dict]:
    articles = list(db.scalars(select(models.KnowledgeBaseArticle)).all())
    if not articles:
        seed_knowledge_base(db)
        articles = list(db.scalars(select(models.KnowledgeBaseArticle)).all())

    if category:
        same_category = [a for a in articles if a.category == category]
        if same_category:
            articles = same_category

    corpus = [
        f"{a.title} {a.problem} {a.keywords} {a.solution} {a.category}" for a in articles
    ]
    vectorizer = TfidfVectorizer(lowercase=True, ngram_range=(1, 2), stop_words="english")
    matrix = vectorizer.fit_transform(corpus + [query])
    scores = cosine_similarity(matrix[-1], matrix[:-1]).flatten()
    ranked = scores.argsort()[::-1][:limit]

    results: list[dict] = []
    for index in ranked:
        article = articles[int(index)]
        results.append(
            {
                "id": article.id,
                "title": article.title,
                "category": article.category,
                "problem": article.problem,
                "solution": article.solution,
                "keywords": article.keywords,
                "similarity": round(float(scores[index]), 4),
            }
        )
    return results
