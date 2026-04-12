import os
import pandas as pd
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from storage.file_manager import save_upload, get_upload_path

router = APIRouter(prefix="/api/datasets")

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_SIZE = 50 * 1024 * 1024  # 50 MB

def _read_dataframe(path) -> pd.DataFrame:
    ext = path.suffix.lower()
    if ext == ".csv":
        return pd.read_csv(path)
    elif ext in (".xlsx", ".xls"):
        return pd.read_excel(path)
    raise ValueError(f"Unsupported format: {ext}")

def _detect_column_type(series: pd.Series) -> str:
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    return "categorical"

@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail={"error": "invalid_format", "message": f"Format {ext} non supporté. Utilisez CSV ou Excel."})

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail={"error": "file_too_large", "message": "Le fichier dépasse la limite de 50 Mo."})

    dataset_id = save_upload(content, file.filename)
    path = get_upload_path(dataset_id)
    df = _read_dataframe(path)

    column_types = {col: _detect_column_type(df[col]) for col in df.columns}
    missing_values = {col: int(df[col].isna().sum()) for col in df.columns}

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "column_types": column_types,
        "missing_values": missing_values,
    }

@router.get("/{dataset_id}/preview")
def preview(dataset_id: str, n: int = 5):
    path = get_upload_path(dataset_id)
    if not path:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Jeu de données introuvable."})
    df = _read_dataframe(path)
    rows = df.head(n).replace({np.nan: None}).to_dict(orient="records")
    return {"rows": rows, "columns": list(df.columns)}

@router.get("/{dataset_id}/stats")
def stats(dataset_id: str):
    path = get_upload_path(dataset_id)
    if not path:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Jeu de données introuvable."})
    df = _read_dataframe(path)
    columns = []
    for col in df.columns:
        dtype = _detect_column_type(df[col])
        stat = {
            "name": col,
            "dtype": dtype,
            "count": int(df[col].count()),
            "missing": int(df[col].isna().sum()),
            "unique": int(df[col].nunique()),
        }
        if dtype == "numeric":
            stat["mean"] = round(float(df[col].mean()), 2)
            stat["std"] = round(float(df[col].std()), 2)
            stat["min"] = float(df[col].min())
            stat["max"] = float(df[col].max())
        else:
            stat["top_values"] = df[col].value_counts().head(10).to_dict()
        columns.append(stat)
    return {"columns": columns}

@router.get("/{dataset_id}/distribution/{column}")
def distribution(dataset_id: str, column: str):
    path = get_upload_path(dataset_id)
    if not path:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Jeu de données introuvable."})
    df = _read_dataframe(path)
    if column not in df.columns:
        raise HTTPException(status_code=400, detail={"error": "invalid_column", "message": f"Colonne '{column}' introuvable."})

    dtype = _detect_column_type(df[column])
    if dtype == "numeric":
        counts, edges = np.histogram(df[column].dropna(), bins=10)
        bins = [{"label": f"{edges[i]:.1f}-{edges[i+1]:.1f}", "count": int(counts[i])} for i in range(len(counts))]
    else:
        vc = df[column].value_counts()
        bins = [{"label": str(k), "count": int(v)} for k, v in vc.items()]

    return {"column": column, "dtype": dtype, "bins": bins}


@router.get("/{dataset_id}/correlations/{target}")
def correlations(dataset_id: str, target: str):
    path = get_upload_path(dataset_id)
    if not path:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Jeu de données introuvable."})
    df = _read_dataframe(path)
    if target not in df.columns:
        raise HTTPException(status_code=400, detail={"error": "invalid_column", "message": f"Colonne '{target}' introuvable."})

    # Encode categorical columns for correlation
    df_encoded = df.copy()
    for col in df_encoded.columns:
        if not pd.api.types.is_numeric_dtype(df_encoded[col]):
            df_encoded[col] = df_encoded[col].astype("category").cat.codes

    result = {}
    for col in df.columns:
        if col == target:
            continue
        try:
            corr = float(df_encoded[col].corr(df_encoded[target]))
            result[col] = round(abs(corr) * 100, 1) if not pd.isna(corr) else 0.0
        except Exception:
            result[col] = 0.0

    return {"target": target, "correlations": result}


@router.get("/{dataset_id}/samples")
def samples(dataset_id: str, n: int = 3):
    path = get_upload_path(dataset_id)
    if not path:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Jeu de données introuvable."})
    df = _read_dataframe(path)
    result = {}
    for col in df.columns:
        unique_vals = df[col].dropna().unique()
        sample_vals = unique_vals[:n].tolist()
        result[col] = [str(v) for v in sample_vals]
    return {"samples": result}


@router.get("/{dataset_id}/describe-columns")
async def describe_columns(dataset_id: str):
    path = get_upload_path(dataset_id)
    if not path:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Jeu de données introuvable."})

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {"descriptions": {}}

    df = _read_dataframe(path)

    # Build context for Claude
    column_info = []
    for col in df.columns:
        dtype = _detect_column_type(df[col])
        sample_vals = df[col].dropna().unique()[:3].tolist()
        column_info.append(f"- {col} (type: {dtype}, exemples: {sample_vals})")

    prompt = (
        "Tu es un assistant pour étudiants débutants en machine learning. "
        "Voici les colonnes d'un jeu de données avec leur type et quelques exemples de valeurs.\n\n"
        + "\n".join(column_info) + "\n\n"
        "Pour chaque colonne, donne une description courte en français (max 10 mots) qui explique "
        "ce que représente cette donnée. Réponds UNIQUEMENT en JSON, sans markdown, au format:\n"
        '{"nom_colonne": "description courte"}'
    )

    try:
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            data = resp.json()
            text = data["content"][0]["text"]
            import json
            descriptions = json.loads(text)
            return {"descriptions": descriptions}
    except Exception:
        return {"descriptions": {}}
