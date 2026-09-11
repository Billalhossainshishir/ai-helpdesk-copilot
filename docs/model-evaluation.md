# Model Evaluation

The classifier uses **TF-IDF + Logistic Regression** across seven IT support categories.

Training data in this repository is synthetic and portfolio-safe. It is useful for demonstrating the end-to-end ML workflow but should not be interpreted as a benchmark for a production service desk.

Run:

```bash
python scripts/train_classifier.py
```

The script performs a stratified 80/20 split, reports accuracy, macro precision, macro recall and macro F1, writes a confusion matrix CSV, then refits the final application model on the complete dataset.

See `models/model_metrics.json` and `models/confusion_matrix.csv` for the latest generated results.
