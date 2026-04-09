import pandas as pd
import numpy as np
import pytest
from ml.preprocessing import preprocess_data

@pytest.fixture
def sample_df():
    return pd.DataFrame({
        "age": [25, 42, np.nan, 22, 35],
        "salary": [35000, 58000, 42000, 28000, 52000],
        "city": ["Paris", "Lyon", "Paris", "Marseille", "Lyon"],
        "purchased": ["Yes", "No", "Yes", "No", "Yes"],
    })

def test_missing_values_mean(sample_df):
    config = {"missing_strategy": "mean", "scaling": "none", "encoding": "onehot", "test_size": 0.2}
    result = preprocess_data(sample_df, target="purchased", features=["age", "salary", "city"], config=config)
    assert not result["X_train"].isnull().any().any()

def test_standard_scaling(sample_df):
    config = {"missing_strategy": "mean", "scaling": "standard", "encoding": "onehot", "test_size": 0.2}
    result = preprocess_data(sample_df, target="purchased", features=["age", "salary", "city"], config=config)
    numeric_cols = [c for c in result["X_train"].columns if "city" not in c]
    for col in numeric_cols:
        assert abs(result["X_train"][col].mean()) < 1.0

def test_onehot_encoding(sample_df):
    config = {"missing_strategy": "mean", "scaling": "none", "encoding": "onehot", "test_size": 0.2}
    result = preprocess_data(sample_df, target="purchased", features=["age", "salary", "city"], config=config)
    assert "city" not in result["X_train"].columns
    city_cols = [c for c in result["X_train"].columns if c.startswith("city_")]
    assert len(city_cols) > 0

def test_train_test_split_ratio(sample_df):
    config = {"missing_strategy": "mean", "scaling": "none", "encoding": "onehot", "test_size": 0.4}
    result = preprocess_data(sample_df, target="purchased", features=["age", "salary", "city"], config=config)
    total = len(result["X_train"]) + len(result["X_test"])
    assert total == 5
    assert len(result["X_test"]) >= 1
