import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    r2_score, mean_absolute_error, mean_squared_error,
    confusion_matrix,
)
from sklearn.inspection import permutation_importance

def evaluate_model(model, X_test, y_test, task_type: str) -> dict:
    y_pred = model.predict(X_test)
    if task_type == "classification":
        return {
            "accuracy": round(accuracy_score(y_test, y_pred), 4),
            "precision": round(precision_score(y_test, y_pred, average="weighted", zero_division=0), 4),
            "recall": round(recall_score(y_test, y_pred, average="weighted", zero_division=0), 4),
            "f1_score": round(f1_score(y_test, y_pred, average="weighted", zero_division=0), 4),
        }
    else:
        return {
            "r2": round(r2_score(y_test, y_pred), 4),
            "mae": round(mean_absolute_error(y_test, y_pred), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
        }

def get_confusion_matrix(model, X_test, y_test, labels=None) -> dict:
    y_pred = model.predict(X_test)
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    return {
        "matrix": cm.tolist(),
        "labels": [str(l) for l in (labels if labels is not None else sorted(set(y_test) | set(y_pred)))],
    }

def get_feature_importance(model, X_test, y_test, feature_names: list[str]) -> list[dict]:
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    else:
        result = permutation_importance(model, X_test, y_test, n_repeats=10, random_state=42)
        importances = result.importances_mean

    items = [{"feature": name, "importance": round(float(imp), 4)} for name, imp in zip(feature_names, importances)]
    items.sort(key=lambda x: x["importance"], reverse=True)
    return items
