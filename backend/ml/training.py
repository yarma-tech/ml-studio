from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.svm import SVC, SVR
from sklearn.model_selection import GridSearchCV

CLASSIFIERS = {
    "random_forest": (RandomForestClassifier, {"n_estimators": [50, 100], "max_depth": [None, 10, 20]}),
    "logistic_regression": (LogisticRegression, {"C": [0.1, 1, 10], "max_iter": [200]}),
    "svm": (SVC, {"C": [0.1, 1, 10], "kernel": ["rbf", "linear"]}),
    "gradient_boosting": (GradientBoostingClassifier, {"n_estimators": [50, 100], "learning_rate": [0.05, 0.1]}),
}

REGRESSORS = {
    "random_forest": (RandomForestRegressor, {"n_estimators": [50, 100], "max_depth": [None, 10, 20]}),
    "linear_regression": (LinearRegression, {}),
    "svr": (SVR, {"C": [0.1, 1, 10], "kernel": ["rbf", "linear"]}),
    "gradient_boosting": (GradientBoostingRegressor, {"n_estimators": [50, 100], "learning_rate": [0.05, 0.1]}),
}

def train_models(data: dict, task_type: str, algorithms: list[str],
                 hyperparameter_tuning: bool = True, cv_folds: int = 5,
                 progress_callback=None) -> dict:
    registry = CLASSIFIERS if task_type == "classification" else REGRESSORS
    results = {}
    total = len(algorithms)

    large_dataset = len(data["X_train"]) > 5000

    for i, algo_name in enumerate(algorithms):
        if algo_name not in registry:
            continue
        model_class, param_grid = registry[algo_name]

        # Reduce grid search for large datasets to avoid very long training
        if large_dataset and param_grid:
            param_grid = {k: v[:1] for k, v in param_grid.items()}

        if hyperparameter_tuning and param_grid:
            # Limit cv folds to number of samples in smallest class
            actual_cv = min(cv_folds, len(data["X_train"]))
            if actual_cv < 2:
                actual_cv = 2
            grid = GridSearchCV(model_class(), param_grid, cv=actual_cv, scoring=None, n_jobs=1)
            grid.fit(data["X_train"], data["y_train"])
            model = grid.best_estimator_
        else:
            model = model_class()
            model.fit(data["X_train"], data["y_train"])

        results[algo_name] = {"model": model}

        if progress_callback:
            progress_callback(algo_name, int((i + 1) / total * 100))

    return results
