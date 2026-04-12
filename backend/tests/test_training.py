import io
import time
import pandas as pd
import numpy as np
import pytest
from ml.preprocessing import preprocess_data
from ml.training import train_models
from ml.evaluation import evaluate_model, get_feature_importance

@pytest.fixture
def classification_data():
    np.random.seed(42)
    n = 100
    df = pd.DataFrame({
        "feature1": np.random.randn(n),
        "feature2": np.random.randn(n),
        "target": np.random.choice(["A", "B"], n),
    })
    config = {"missing_strategy": "mean", "scaling": "standard", "encoding": "onehot", "test_size": 0.2}
    return preprocess_data(df, target="target", features=["feature1", "feature2"], config=config)

@pytest.fixture
def regression_data():
    np.random.seed(42)
    n = 100
    df = pd.DataFrame({
        "feature1": np.random.randn(n),
        "feature2": np.random.randn(n),
    })
    df["target"] = df["feature1"] * 2 + df["feature2"] + np.random.randn(n) * 0.1
    config = {"missing_strategy": "mean", "scaling": "standard", "encoding": "onehot", "test_size": 0.2}
    return preprocess_data(df, target="target", features=["feature1", "feature2"], config=config)

def test_train_classification(classification_data):
    results = train_models(classification_data, task_type="classification",
        algorithms=["random_forest", "logistic_regression"], hyperparameter_tuning=False, cv_folds=3)
    assert len(results) == 2
    assert "random_forest" in results
    assert "model" in results["random_forest"]

def test_train_regression(regression_data):
    results = train_models(regression_data, task_type="regression",
        algorithms=["random_forest", "linear_regression"], hyperparameter_tuning=False, cv_folds=3)
    assert len(results) == 2

def test_evaluate_classification(classification_data):
    results = train_models(classification_data, task_type="classification",
        algorithms=["random_forest"], hyperparameter_tuning=False, cv_folds=3)
    metrics = evaluate_model(results["random_forest"]["model"],
        classification_data["X_test"], classification_data["y_test"], task_type="classification")
    assert "accuracy" in metrics
    assert "f1_score" in metrics
    assert 0 <= metrics["accuracy"] <= 1

def test_evaluate_regression(regression_data):
    results = train_models(regression_data, task_type="regression",
        algorithms=["random_forest"], hyperparameter_tuning=False, cv_folds=3)
    metrics = evaluate_model(results["random_forest"]["model"],
        regression_data["X_test"], regression_data["y_test"], task_type="regression")
    assert "r2" in metrics
    assert "mae" in metrics
    assert "rmse" in metrics

def test_feature_importance(classification_data):
    results = train_models(classification_data, task_type="classification",
        algorithms=["random_forest"], hyperparameter_tuning=False, cv_folds=3)
    importance = get_feature_importance(results["random_forest"]["model"],
        classification_data["X_test"], classification_data["y_test"], classification_data["feature_names"])
    assert len(importance) == 2
    assert all("feature" in item and "importance" in item for item in importance)


def _train_via_api(client, sample_csv):
    """Helper: upload dataset + train a model via API, return training_id."""
    with open(sample_csv, "rb") as f:
        upload = client.post("/api/datasets/upload", files={"file": ("sample.csv", f, "text/csv")})
    dataset_id = upload.json()["dataset_id"]

    config = {
        "dataset_id": dataset_id,
        "target_column": "purchased",
        "feature_columns": ["age", "salary", "city"],
        "task_type": "classification",
        "preprocessing": {"missing_strategy": "mean", "scaling": "standard", "encoding": "onehot", "test_size": 0.2},
        "algorithms": ["random_forest"],
        "cross_validation_folds": 3,
        "hyperparameter_tuning": False,
    }
    response = client.post("/api/training/start", json=config)
    training_id = response.json()["training_id"]

    for _ in range(60):
        status = client.get(f"/api/training/{training_id}/status").json()
        if status["status"] in ("complete", "error"):
            break
        time.sleep(0.5)

    assert status["status"] == "complete"
    return training_id


def test_predict_batch(client, sample_csv):
    training_id = _train_via_api(client, sample_csv)

    pred_csv = "age,salary,city\n28,40000,Paris\n39,55000,Lyon\n"
    response = client.post(
        f"/api/training/{training_id}/predict",
        files={"file": ("predict.csv", io.BytesIO(pred_csv.encode()), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 2
    assert "prediction" in data["columns"]
    assert len(data["rows"]) == 2
    assert "prediction" in data["rows"][0]


def test_predict_batch_missing_columns(client, sample_csv):
    training_id = _train_via_api(client, sample_csv)

    bad_csv = "age,salary\n28,40000\n"
    response = client.post(
        f"/api/training/{training_id}/predict",
        files={"file": ("predict.csv", io.BytesIO(bad_csv.encode()), "text/csv")},
    )
    assert response.status_code == 400
    assert "city" in response.json()["detail"]["message"].lower()


def test_predict_batch_not_found(client):
    pred_csv = "age,salary,city\n28,40000,Paris\n"
    response = client.post(
        "/api/training/nonexistent/predict",
        files={"file": ("predict.csv", io.BytesIO(pred_csv.encode()), "text/csv")},
    )
    assert response.status_code == 404


def test_predict_download(client, sample_csv):
    training_id = _train_via_api(client, sample_csv)

    # First make a prediction
    pred_csv = "age,salary,city\n28,40000,Paris\n"
    client.post(
        f"/api/training/{training_id}/predict",
        files={"file": ("predict.csv", io.BytesIO(pred_csv.encode()), "text/csv")},
    )

    # Then download
    response = client.get(f"/api/training/{training_id}/predict/download")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "prediction" in response.text
