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
