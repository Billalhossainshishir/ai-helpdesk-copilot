from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

from backend.app.ml import MODEL_PATH, _train_pipeline

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "training_tickets.csv"
METRICS = ROOT / "models" / "model_metrics.json"
CONFUSION = ROOT / "models" / "confusion_matrix.csv"


def main() -> None:
    data = pd.read_csv(DATA)
    train, test = train_test_split(
        data,
        test_size=0.2,
        random_state=42,
        stratify=data["category"],
    )

    # Train the same pipeline definition used by the application, but only on the training split for evaluation.
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline

    pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), sublinear_tf=True)),
            (
                "classifier",
                LogisticRegression(max_iter=2500, class_weight="balanced", random_state=42),
            ),
        ]
    )
    pipeline.fit(train["text"], train["category"])
    predicted = pipeline.predict(test["text"])

    labels = sorted(data["category"].unique())
    report = classification_report(test["category"], predicted, output_dict=True, zero_division=0)
    metrics = {
        "dataset_rows": int(len(data)),
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "accuracy": round(float(accuracy_score(test["category"], predicted)), 4),
        "macro_precision": round(float(report["macro avg"]["precision"]), 4),
        "macro_recall": round(float(report["macro avg"]["recall"]), 4),
        "macro_f1": round(float(report["macro avg"]["f1-score"]), 4),
        "labels": labels,
    }
    METRICS.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    matrix = confusion_matrix(test["category"], predicted, labels=labels)
    pd.DataFrame(matrix, index=labels, columns=labels).to_csv(CONFUSION)

    # Refit on the complete dataset for the application artifact.
    final_model = _train_pipeline()
    joblib.dump(final_model, MODEL_PATH)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
