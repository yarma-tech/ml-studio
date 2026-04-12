import type {
  DatasetMetadata, ColumnStats, DistributionData,
  TrainingConfig, TrainingResults, TrainingProgress,
  ConfusionMatrixData, FeatureImportanceItem, BatchPredictionResult,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erreur de requête" }));
    throw new Error(error.message || error.detail?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function uploadDataset(file: File): Promise<DatasetMetadata> {
  const form = new FormData();
  form.append("file", file);
  return fetchJSON("/api/datasets/upload", { method: "POST", body: form });
}

export async function getPreview(datasetId: string) {
  return fetchJSON<{ rows: Record<string, unknown>[]; columns: string[] }>(`/api/datasets/${datasetId}/preview`);
}

export async function getStats(datasetId: string) {
  return fetchJSON<{ columns: ColumnStats[] }>(`/api/datasets/${datasetId}/stats`);
}

export async function getDistribution(datasetId: string, column: string) {
  return fetchJSON<DistributionData>(`/api/datasets/${datasetId}/distribution/${column}`);
}

export async function getCorrelations(datasetId: string, target: string) {
  return fetchJSON<{ target: string; correlations: Record<string, number> }>(`/api/datasets/${datasetId}/correlations/${target}`);
}

export async function getSamples(datasetId: string) {
  return fetchJSON<{ samples: Record<string, string[]> }>(`/api/datasets/${datasetId}/samples`);
}

export async function describeColumns(datasetId: string) {
  return fetchJSON<{ descriptions: Record<string, string> }>(`/api/datasets/${datasetId}/describe-columns`);
}

export async function startTraining(config: TrainingConfig) {
  return fetchJSON<{ training_id: string }>("/api/training/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

export async function getTrainingStatus(trainingId: string) {
  return fetchJSON<TrainingProgress>(`/api/training/${trainingId}/status`);
}

export async function getTrainingResults(trainingId: string) {
  return fetchJSON<TrainingResults>(`/api/training/${trainingId}/results`);
}

export async function getConfusionMatrix(trainingId: string, modelName?: string) {
  const params = modelName ? `?model_name=${modelName}` : "";
  return fetchJSON<ConfusionMatrixData>(`/api/training/${trainingId}/confusion-matrix${params}`);
}

export async function getFeatureImportance(trainingId: string, modelName?: string) {
  const params = modelName ? `?model_name=${modelName}` : "";
  return fetchJSON<FeatureImportanceItem[]>(`/api/training/${trainingId}/feature-importance${params}`);
}

export function getExportUrl(trainingId: string, modelName: string): string {
  return `${API_BASE}/api/training/${trainingId}/export/${modelName}`;
}

export async function predictBatch(trainingId: string, file: File, modelName?: string): Promise<BatchPredictionResult> {
  const form = new FormData();
  form.append("file", file);
  const params = modelName ? `?model_name=${modelName}` : "";
  return fetchJSON(`/api/training/${trainingId}/predict${params}`, { method: "POST", body: form });
}

export function getPredictionDownloadUrl(trainingId: string): string {
  return `${API_BASE}/api/training/${trainingId}/predict/download`;
}
