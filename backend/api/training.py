import uuid
import asyncio
import joblib
import io
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from models.schemas import TrainingConfig
from storage.file_manager import get_upload_path, save_model, get_model_path
from ml.preprocessing import preprocess_data
from ml.training import train_models
from ml.evaluation import evaluate_model, get_confusion_matrix, get_feature_importance
from api.websocket import broadcast, set_status, get_status
import pandas as pd

router = APIRouter(prefix="/api/training")

_results: dict[str, dict] = {}

def _read_dataframe(path) -> pd.DataFrame:
    ext = path.suffix.lower()
    if ext == ".csv":
        return pd.read_csv(path)
    return pd.read_excel(path)

async def _run_training(training_id: str, config: TrainingConfig):
    try:
        set_status(training_id, {"training_id": training_id, "status": "training", "progress": 0})

        path = get_upload_path(config.dataset_id)
        df = _read_dataframe(path)

        prep_config = {
            "missing_strategy": config.preprocessing.missing_strategy,
            "scaling": config.preprocessing.scaling,
            "encoding": config.preprocessing.encoding,
            "test_size": config.preprocessing.test_size,
        }

        data = preprocess_data(df, target=config.target_column, features=config.feature_columns, config=prep_config)

        loop = asyncio.get_event_loop()

        def progress_callback(model_name, progress):
            asyncio.run_coroutine_threadsafe(
                broadcast(training_id, {
                    "training_id": training_id,
                    "status": "training",
                    "current_model": model_name,
                    "progress": progress,
                }),
                loop,
            )

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

        set_status(training_id, {"training_id": training_id, "status": "complete", "progress": 100})
        await broadcast(training_id, {"training_id": training_id, "status": "complete", "progress": 100})

    except Exception as e:
        set_status(training_id, {"training_id": training_id, "status": "error", "message": str(e)})
        await broadcast(training_id, {"training_id": training_id, "status": "error", "message": str(e)})

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
