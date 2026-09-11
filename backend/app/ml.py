from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = PROJECT_ROOT / "data" / "training_tickets.csv"
MODEL_PATH = PROJECT_ROOT / "models" / "ticket_classifier.joblib"


def _train_pipeline() -> Pipeline:
    data = pd.read_csv(DATASET_PATH)
    pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    min_df=1,
                    max_features=10000,
                    sublinear_tf=True,
                ),
            ),
            (
                "classifier",
                LogisticRegression(
                    max_iter=2500,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )
    pipeline.fit(data["text"], data["category"])
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    return pipeline


@lru_cache(maxsize=1)
def get_classifier() -> Pipeline:
    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)
    return _train_pipeline()


def predict_category(title: str, description: str) -> dict:
    text = f"{title}. {description}".strip()
    pipeline = get_classifier()
    probabilities = pipeline.predict_proba([text])[0]
    classes = pipeline.classes_
    best_index = int(probabilities.argmax())
    return {
        "category": str(classes[best_index]),
        "confidence": round(float(probabilities[best_index]), 4),
        "model": "TF-IDF + Logistic Regression",
    }
