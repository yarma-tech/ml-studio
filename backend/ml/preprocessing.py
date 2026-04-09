import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder

def preprocess_data(df: pd.DataFrame, target: str, features: list[str], config: dict) -> dict:
    X = df[features].copy()
    y = df[target].copy()

    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()

    strategy = config.get("missing_strategy", "mean")
    if strategy == "drop":
        mask = X.notna().all(axis=1)
        X = X[mask]
        y = y[mask]
    elif strategy == "mean":
        for col in numeric_cols:
            X[col] = X[col].fillna(X[col].mean())
        for col in categorical_cols:
            X[col] = X[col].fillna(X[col].mode()[0] if not X[col].mode().empty else "unknown")
    elif strategy == "median":
        for col in numeric_cols:
            X[col] = X[col].fillna(X[col].median())
        for col in categorical_cols:
            X[col] = X[col].fillna(X[col].mode()[0] if not X[col].mode().empty else "unknown")
    elif strategy == "mode":
        for col in X.columns:
            X[col] = X[col].fillna(X[col].mode()[0] if not X[col].mode().empty else "unknown")

    encoding = config.get("encoding", "onehot")
    if encoding == "onehot":
        X = pd.get_dummies(X, columns=categorical_cols, prefix=categorical_cols)
    elif encoding == "label":
        for col in categorical_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))

    target_encoder = None
    if y.dtype == object or not pd.api.types.is_numeric_dtype(y):
        target_encoder = LabelEncoder()
        y = pd.Series(target_encoder.fit_transform(y), index=y.index)

    test_size = config.get("test_size", 0.2)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

    scaling = config.get("scaling", "none")
    final_numeric_cols = X_train.select_dtypes(include=[np.number]).columns.tolist()

    scaler = None
    if scaling == "standard" and final_numeric_cols:
        scaler = StandardScaler()
        X_train[final_numeric_cols] = scaler.fit_transform(X_train[final_numeric_cols])
        X_test[final_numeric_cols] = scaler.transform(X_test[final_numeric_cols])
    elif scaling == "minmax" and final_numeric_cols:
        scaler = MinMaxScaler()
        X_train[final_numeric_cols] = scaler.fit_transform(X_train[final_numeric_cols])
        X_test[final_numeric_cols] = scaler.transform(X_test[final_numeric_cols])

    return {
        "X_train": X_train, "X_test": X_test,
        "y_train": y_train, "y_test": y_test,
        "scaler": scaler, "target_encoder": target_encoder,
        "feature_names": list(X_train.columns),
    }
