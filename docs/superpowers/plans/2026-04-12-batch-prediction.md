# Batch Prediction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow students to upload a new CSV after training and get predictions from any trained model, displayed in a table with CSV download.

**Architecture:** New `POST /api/training/{id}/predict` endpoint reuses the scaler/encoder/model stored in `_results` dict. Frontend adds a `BatchPredict` card in the Results step with upload, table display, and CSV download.

**Tech Stack:** FastAPI, pandas, scikit-learn (backend) — React, react-dropzone, Tailwind (frontend)

**Spec:** `docs/superpowers/specs/2026-04-12-batch-prediction-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `backend/api/training.py` | Add predict + download endpoints |
| Modify | `backend/tests/test_training.py` | Add predict endpoint tests |
| Create | `frontend/components/results/BatchPredict.tsx` | Upload, table, download UI |
| Modify | `frontend/lib/api.ts` | Add `predictBatch()` + `getPredictionDownloadUrl()` |
| Modify | `frontend/lib/types.ts` | Add `BatchPredictionResult` interface |
| Modify | `frontend/app/studio/page.tsx` | Wire `BatchPredict` into Results step |

---

## Task 1: Backend — Predict endpoint

**Files:**
- Modify: `backend/api/training.py:1-214`
- Modify: `backend/tests/test_training.py`

- [ ] **Step 1: Write the failing test for predict endpoint**

Add to `backend/tests/test_training.py`:

```python
import io
import csv

def _train_model(client, sample_csv):
    """Helper: upload dataset + train a model, return training_id."""
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

    # Wait for training to complete
    import time
    for _ in range(30):
        status = client.get(f"/api/training/{training_id}/status").json()
        if status["status"] in ("complete", "error"):
            break
        time.sleep(0.5)

    return training_id


def test_predict_batch(client, sample_csv):
    training_id = _train_model(client, sample_csv)

    # Create a prediction CSV (same features, no target column)
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
    training_id = _train_model(client, sample_csv)

    # CSV missing the "city" column
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_training.py::test_predict_batch tests/test_training.py::test_predict_batch_missing_columns tests/test_training.py::test_predict_batch_not_found -v`
Expected: FAIL — 404 because endpoint doesn't exist

- [ ] **Step 3: Implement the predict endpoint**

Add to `backend/api/training.py`, after the existing imports add `from fastapi import UploadFile, File` to the existing import line. Then add these two endpoints before the `export_model` route:

```python
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

    # Read uploaded CSV
    content = await file.read()
    try:
        new_df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail={"error": "invalid_file", "message": "Fichier CSV invalide."})

    # Keep original data for display
    original_df = new_df.copy()

    # Determine which original (pre-encoding) columns are expected
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

    # Identify column types for preprocessing
    numeric_cols = [c for c in new_df.select_dtypes(include=[np.number]).columns if c in expected_raw]
    categorical_cols = [c for c in new_df.select_dtypes(exclude=[np.number]).columns if c in expected_raw]

    # Impute missing values (same strategy as training — mean for numeric, mode for categorical)
    for col in numeric_cols:
        if new_df[col].isna().any():
            new_df[col] = new_df[col].fillna(new_df[col].mean())
    for col in categorical_cols:
        if new_df[col].isna().any():
            mode = new_df[col].mode()
            new_df[col] = new_df[col].fillna(mode[0] if not mode.empty else "unknown")

    # One-hot encode categorical columns
    if categorical_cols:
        new_df = pd.get_dummies(new_df, columns=categorical_cols, prefix=categorical_cols)

    # Align columns with training feature_names (add missing one-hot cols as 0, drop extras)
    new_df = new_df.reindex(columns=feature_names, fill_value=0)

    # Scale all numeric columns AFTER encoding (matches training pipeline — preprocessing.py:48-59)
    if scaler is not None:
        final_numeric = new_df.select_dtypes(include=[np.number]).columns.tolist()
        if final_numeric:
            new_df[final_numeric] = scaler.transform(new_df[final_numeric])

    # Predict
    predictions = model.predict(new_df)

    # Inverse-transform target if label-encoded
    if target_encoder is not None:
        predictions = target_encoder.inverse_transform(predictions.astype(int))

    # Build response with original columns + prediction
    original_df["prediction"] = predictions
    columns = list(original_df.columns)
    rows = original_df.to_dict(orient="records")

    # Store for CSV download
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
        raise HTTPException(status_code=404, detail={"error": "no_predictions", "message": "Aucune prédiction disponible. Lancez d'abord une prédiction."})

    df = r["last_predictions"]["df"]
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)

    return StreamingResponse(
        io.BytesIO(buffer.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictions.csv"},
    )
```

Update the imports at the top of `backend/api/training.py`:
```python
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
```

Add `import numpy as np` to the existing imports (after `import pandas as pd`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_training.py -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add backend/api/training.py backend/tests/test_training.py
git commit -m "feat(backend): add batch prediction endpoint with CSV upload and download"
```

---

## Task 2: Frontend — Types and API client

**Files:**
- Modify: `frontend/lib/types.ts:1-77`
- Modify: `frontend/lib/api.ts:1-77`

- [ ] **Step 1: Add BatchPredictionResult type**

Add to end of `frontend/lib/types.ts`:

```typescript
export interface BatchPredictionResult {
  model_name: string;
  prediction_column: string;
  total_rows: number;
  columns: string[];
  rows: Record<string, unknown>[];
}
```

- [ ] **Step 2: Add API functions**

Add to end of `frontend/lib/api.ts`:

```typescript
export async function predictBatch(trainingId: string, file: File, modelName?: string): Promise<BatchPredictionResult> {
  const form = new FormData();
  form.append("file", file);
  const params = modelName ? `?model_name=${modelName}` : "";
  return fetchJSON(`/api/training/${trainingId}/predict${params}`, { method: "POST", body: form });
}

export function getPredictionDownloadUrl(trainingId: string): string {
  return `${API_BASE}/api/training/${trainingId}/predict/download`;
}
```

Add `BatchPredictionResult` to the import in `api.ts`:

```typescript
import type {
  DatasetMetadata, ColumnStats, DistributionData,
  TrainingConfig, TrainingResults, TrainingProgress,
  ConfusionMatrixData, FeatureImportanceItem, BatchPredictionResult,
} from "./types";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/api.ts
git commit -m "feat(frontend): add batch prediction types and API client"
```

---

## Task 3: Frontend — BatchPredict component

**Files:**
- Create: `frontend/components/results/BatchPredict.tsx`

- [ ] **Step 1: Create BatchPredict component**

Create `frontend/components/results/BatchPredict.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { predictBatch, getPredictionDownloadUrl } from "@/lib/api";
import type { ModelResult, BatchPredictionResult } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Props {
  trainingId: string;
  models: ModelResult[];
}

export default function BatchPredict({ trainingId, models }: Props) {
  const [selectedModel, setSelectedModel] = useState(
    models.find((m) => m.is_best)?.name || models[0]?.name
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchPredictionResult | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const data = await predictBatch(trainingId, files[0], selectedModel);
        setResult(data);
      } catch (e: any) {
        setError(e.message || "Erreur lors de la prédiction");
      } finally {
        setLoading(false);
      }
    },
    [trainingId, selectedModel]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  return (
    <Card title="Prédiction par lot">
      <div className="space-y-4">
        {/* Model selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">Modèle :</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name.replace(/_/g, " ")}{m.is_best ? " (meilleur)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
          }`}
        >
          <input {...getInputProps()} />
          {loading ? (
            <p className="text-gray-500">Prédiction en cours...</p>
          ) : (
            <>
              <p className="text-gray-600 text-sm font-medium">
                Glisser-déposer un fichier CSV à prédire
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Mêmes colonnes que l&apos;entraînement, sans la colonne cible
              </p>
            </>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Results table */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {result.total_rows} prédiction{result.total_rows > 1 ? "s" : ""}
              </p>
              <a href={getPredictionDownloadUrl(trainingId)} download>
                <Button variant="outline">Télécharger CSV</Button>
              </a>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {result.columns.map((col) => (
                      <th
                        key={col}
                        className={`px-3 py-2 text-left font-medium ${
                          col === "prediction" ? "text-blue-700 bg-blue-50" : "text-gray-500"
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {result.columns.map((col) => (
                        <td
                          key={col}
                          className={`px-3 py-2 ${
                            col === "prediction" ? "font-semibold text-blue-700 bg-blue-50/50" : "text-gray-700"
                          }`}
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 50 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  Affichage limité aux 50 premières lignes — téléchargez le CSV pour voir tout
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/results/BatchPredict.tsx
git commit -m "feat(frontend): add BatchPredict component with upload, table, and download"
```

---

## Task 4: Frontend — Wire BatchPredict into studio page

**Files:**
- Modify: `frontend/app/studio/page.tsx:1-75`

- [ ] **Step 1: Add import and render BatchPredict**

In `frontend/app/studio/page.tsx`:

Add import at line 19 (after ModelExport import):
```typescript
import BatchPredict from "@/components/results/BatchPredict";
```

Add `<BatchPredict>` after the `<ModelExport>` line (line 57), inside the results step:
```tsx
{trainingId && <BatchPredict trainingId={trainingId} models={results.models} />}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/studio/page.tsx
git commit -m "feat(frontend): wire BatchPredict into results step"
```

---

## Task 5: End-to-end verification

- [ ] **Step 1: Run backend tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 2: Start backend and frontend**

Run: `cd backend && uvicorn main:app --reload` (background)
Run: `cd frontend && npm run dev` (background)

- [ ] **Step 3: Manual verification via preview**

1. Upload a CSV dataset
2. Walk through all steps to train a model
3. In Results step, verify BatchPredict card appears
4. Upload a prediction CSV (same features, no target)
5. Verify predictions table displays with highlighted prediction column
6. Click "Télécharger CSV" and verify download works
7. Upload a CSV with missing columns → verify error message

- [ ] **Step 4: Final commit if any fixes needed**
