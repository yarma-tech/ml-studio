import uuid
import time
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
MODELS_DIR = DATA_DIR / "trained_models"


def ensure_dirs():
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)


def save_upload(file_bytes: bytes, filename: str) -> str:
    ensure_dirs()
    dataset_id = str(uuid.uuid4())[:8]
    ext = Path(filename).suffix
    dest = UPLOADS_DIR / f"{dataset_id}{ext}"
    dest.write_bytes(file_bytes)
    return dataset_id


def get_upload_path(dataset_id: str) -> Path | None:
    ensure_dirs()
    for f in UPLOADS_DIR.iterdir():
        if f.stem == dataset_id:
            return f
    return None


def save_model(training_id: str, model_name: str, model_bytes: bytes) -> Path:
    ensure_dirs()
    dest = MODELS_DIR / f"{training_id}_{model_name}.joblib"
    dest.write_bytes(model_bytes)
    return dest


def get_model_path(training_id: str, model_name: str) -> Path | None:
    path = MODELS_DIR / f"{training_id}_{model_name}.joblib"
    return path if path.exists() else None


def cleanup_old_files(max_age_hours: int = 24):
    now = time.time()
    for directory in [UPLOADS_DIR, MODELS_DIR]:
        if not directory.exists():
            continue
        for f in directory.iterdir():
            if f.name == ".gitkeep":
                continue
            if (now - f.stat().st_mtime) > max_age_hours * 3600:
                f.unlink()
