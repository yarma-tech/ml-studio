import uuid
import joblib
import io
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse
import numpy as np
from models.schemas import TrainingConfig
from storage.file_manager import get_upload_path, save_model, get_model_path
from ml.preprocessing import preprocess_data
from ml.training import train_models
from ml.evaluation import evaluate_model, get_confusion_matrix, get_feature_importance
from api.websocket import set_status, get_status
import pandas as pd

logger = logging.getLogger(__name__)

MAX_TRAINING_ROWS = 10000

router = APIRouter(prefix="/api/training")

_results: dict[str, dict] = {}

def _read_dataframe(path) -> pd.DataFrame:
    ext = path.suffix.lower()
    if ext == ".csv":
        return pd.read_csv(path)
    return pd.read_excel(path)

def _run_training(training_id: str, config: TrainingConfig):
    try:
        logger.info(f"Training {training_id} started — dataset={config.dataset_id}, algos={config.algorithms}")
        set_status(training_id, {"training_id": training_id, "status": "training", "progress": 0})

        path = get_upload_path(config.dataset_id)
        df = _read_dataframe(path)

        if len(df) > MAX_TRAINING_ROWS:
            logger.info(f"Training {training_id}: sampling {MAX_TRAINING_ROWS} rows from {len(df)}")
            df = df.sample(n=MAX_TRAINING_ROWS, random_state=42)

        prep_config = {
            "missing_strategy": config.preprocessing.missing_strategy,
            "scaling": config.preprocessing.scaling,
            "encoding": config.preprocessing.encoding,
            "test_size": config.preprocessing.test_size,
        }

        data = preprocess_data(df, target=config.target_column, features=config.feature_columns, config=prep_config)

        def progress_callback(model_name, progress):
            set_status(training_id, {
                "training_id": training_id,
                "status": "training",
                "current_model": model_name,
                "progress": progress,
            })

        trained = train_models(
            data, task_type=config.task_type, algorithms=config.algorithms,
            hyperparameter_tuning=config.hyperparameter_tuning,
            cv_folds=config.cross_validation_folds,
            progress_callback=progress_callback,
        )

        models_results = []
        best_score = -float("inf")
        best_name = None

        for name, result in trained.items():
            model = result["model"]
            metrics = evaluate_model(model, data["X_test"], data["y_test"], config.task_type)

            score = metrics.get("f1_score", metrics.get("r2", 0))
            if score > best_score:
                best_score = score
                best_name = name

            model_bytes = io.BytesIO()
            joblib.dump(model, model_bytes)
            save_model(training_id, name, model_bytes.getvalue())

            models_results.append({"name": name, "metrics": metrics, "is_best": False})

        for m in models_results:
            if m["name"] == best_name:
                m["is_best"] = True

        _results[training_id] = {
            "training_id": training_id,
            "task_type": config.task_type,
            "models": models_results,
            "data": data,
            "trained_models": trained,
            "target_encoder": data.get("target_encoder"),
        }

        logger.info(f"Training {training_id} complete — best model: {best_name}")
        set_status(training_id, {"training_id": training_id, "status": "complete", "progress": 100})

    except Exception as e:
        logger.exception(f"Training {training_id} failed")
        set_status(training_id, {"training_id": training_id, "status": "error", "progress": 0, "message": str(e)})

@router.post("/start")
async def start_training(config: TrainingConfig, background_tasks: BackgroundTasks):
    path = get_upload_path(config.dataset_id)
    if not path:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Jeu de données introuvable."})

    training_id = str(uuid.uuid4())[:8]
    background_tasks.add_task(_run_training, training_id, config)
    return {"training_id": training_id, "status": "pending"}

@router.get("/{training_id}/status")
def training_status(training_id: str):
    status = get_status(training_id)
    if not status:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Entraînement introuvable."})
    return status

@router.get("/{training_id}/results")
def training_results(training_id: str):
    if training_id not in _results:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Résultats introuvables."})
    r = _results[training_id]
    return {"training_id": r["training_id"], "task_type": r["task_type"], "models": r["models"]}

@router.get("/{training_id}/confusion-matrix")
def confusion_matrix_route(training_id: str, model_name: str = None):
    if training_id not in _results:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Résultats introuvables."})
    r = _results[training_id]
    if r["task_type"] != "classification":
        raise HTTPException(status_code=400, detail={"error": "invalid_task", "message": "Matrice de confusion uniquement pour la classification."})

    name = model_name or next((m["name"] for m in r["models"] if m["is_best"]), r["models"][0]["name"])
    model = r["trained_models"][name]["model"]
    labels = list(r["target_encoder"].classes_) if r.get("target_encoder") else None
    return get_confusion_matrix(model, r["data"]["X_test"], r["data"]["y_test"], labels=labels)

@router.get("/{training_id}/feature-importance")
def feature_importance_route(training_id: str, model_name: str = None):
    if training_id not in _results:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Résultats introuvables."})
    r = _results[training_id]
    name = model_name or next((m["name"] for m in r["models"] if m["is_best"]), r["models"][0]["name"])
    model = r["trained_models"][name]["model"]
    return get_feature_importance(model, r["data"]["X_test"], r["data"]["y_test"], r["data"]["feature_names"])

@router.get("/{training_id}/regression-curves")
def regression_curves_route(training_id: str, feature: str = None):
    """Return data for regression curve visualization.
    For each model, returns predictions sorted by a chosen feature.
    Also returns the actual data points for scatter plot.
    """
    if training_id not in _results:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Résultats introuvables."})
    r = _results[training_id]
    data = r["data"]
    X_test = data["X_test"]
    y_test = data["y_test"]
    feature_names = data["feature_names"]

    # Find available original numeric features (before encoding)
    # Original features are those without underscore prefixes from one-hot encoding
    original_features = [f for f in feature_names if "_" not in f or f in X_test.columns]
    # Fallback: use all feature names
    if not original_features:
        original_features = feature_names

    # Pick the feature to plot on X axis
    chosen_feature = feature if feature and feature in X_test.columns else original_features[0] if original_features else feature_names[0]

    # Get feature values for X axis
    feature_values = X_test[chosen_feature].tolist()
    actual_values = y_test.tolist()

    # Sort indices by feature value for clean line plots
    sorted_indices = sorted(range(len(feature_values)), key=lambda i: feature_values[i])

    # Build scatter data (actual points)
    scatter = [
        {"x": float(feature_values[i]), "y": float(actual_values[i])}
        for i in sorted_indices
    ]

    # Build prediction curves for each model
    curves = {}
    for name, result in r["trained_models"].items():
        model = result["model"]
        y_pred = model.predict(X_test)
        curves[name] = [
            {"x": float(feature_values[i]), "y": float(y_pred[i])}
            for i in sorted_indices
        ]

    return {
        "feature": chosen_feature,
        "available_features": [f for f in X_test.columns if not any(f.startswith(p + "_") for p in feature_names)],
        "scatter": scatter,
        "curves": curves,
    }


@router.get("/{training_id}/predictions")
def predictions_route(training_id: str, model_name: str = None):
    if training_id not in _results:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Résultats introuvables."})
    r = _results[training_id]
    name = model_name or next((m["name"] for m in r["models"] if m["is_best"]), r["models"][0]["name"])
    model = r["trained_models"][name]["model"]
    y_pred = model.predict(r["data"]["X_test"])
    y_actual = r["data"]["y_test"].tolist()
    return {"predictions": [{"actual": float(a), "predicted": float(p)} for a, p in zip(y_actual, y_pred)]}

@router.post("/{training_id}/predict")
async def predict_batch(training_id: str, file: UploadFile = File(...), model_name: str = None):
    if training_id not in _results:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Résultats introuvables."})

    r = _results[training_id]
    name = model_name or next((m["name"] for m in r["models"] if m["is_best"]), r["models"][0]["name"])
    model = r["trained_models"][name]["model"]
    data = r["data"]
    feature_names = data["feature_names"]
    scaler = data.get("scaler")
    target_encoder = r.get("target_encoder")

    content = await file.read()
    try:
        new_df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail={"error": "invalid_file", "message": "Fichier CSV invalide."})

    original_df = new_df.copy()

    # Determine which raw columns are expected (before one-hot encoding)
    raw_columns = set(new_df.columns)
    expected_raw = set()
    for fname in feature_names:
        parts = fname.rsplit("_", 1)
        if len(parts) == 2 and parts[0] in raw_columns:
            expected_raw.add(parts[0])
        elif fname in raw_columns:
            expected_raw.add(fname)
        else:
            base = parts[0] if len(parts) == 2 else fname
            expected_raw.add(base)

    missing = expected_raw - raw_columns
    if missing:
        raise HTTPException(status_code=400, detail={
            "error": "missing_columns",
            "message": f"Colonnes manquantes : {', '.join(sorted(missing))}",
        })

    numeric_cols = [c for c in new_df.select_dtypes(include=[np.number]).columns if c in expected_raw]
    categorical_cols = [c for c in new_df.select_dtypes(exclude=[np.number]).columns if c in expected_raw]

    for col in numeric_cols:
        if new_df[col].isna().any():
            new_df[col] = new_df[col].fillna(new_df[col].mean())
    for col in categorical_cols:
        if new_df[col].isna().any():
            mode = new_df[col].mode()
            new_df[col] = new_df[col].fillna(mode[0] if not mode.empty else "unknown")

    if categorical_cols:
        new_df = pd.get_dummies(new_df, columns=categorical_cols, prefix=categorical_cols)

    new_df = new_df.reindex(columns=feature_names, fill_value=0)

    if scaler is not None:
        scaler_cols = list(scaler.feature_names_in_)
        new_df[scaler_cols] = scaler.transform(new_df[scaler_cols])

    predictions = model.predict(new_df)

    if target_encoder is not None:
        predictions = target_encoder.inverse_transform(predictions.astype(int))

    original_df["prediction"] = predictions
    columns = list(original_df.columns)
    rows = original_df.to_dict(orient="records")

    r["last_predictions"] = {"model_name": name, "df": original_df}

    return {
        "model_name": name,
        "prediction_column": "prediction",
        "total_rows": len(rows),
        "columns": columns,
        "rows": rows,
    }


@router.get("/{training_id}/predict/download")
def download_predictions(training_id: str):
    if training_id not in _results:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Résultats introuvables."})

    r = _results[training_id]
    if "last_predictions" not in r:
        raise HTTPException(status_code=404, detail={"error": "no_predictions", "message": "Aucune prédiction disponible."})

    df = r["last_predictions"]["df"]
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)

    return StreamingResponse(
        io.BytesIO(buffer.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictions.csv"},
    )


@router.get("/{training_id}/export/{model_name}")
def export_model(training_id: str, model_name: str):
    path = get_model_path(training_id, model_name)
    if not path:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Modèle introuvable."})
    return StreamingResponse(
        open(path, "rb"),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={model_name}.joblib"},
    )
