export interface DatasetMetadata {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  column_names: string[];
  column_types: Record<string, "numeric" | "categorical">;
  missing_values: Record<string, number>;
}

export interface ColumnStats {
  name: string;
  dtype: "numeric" | "categorical";
  count: number;
  missing: number;
  unique: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  top_values?: Record<string, number>;
}

export interface DistributionData {
  column: string;
  dtype: string;
  bins: { label: string; count: number }[];
}

export interface PreprocessingConfig {
  missing_strategy: "mean" | "median" | "mode" | "drop";
  scaling: "standard" | "minmax" | "none";
  encoding: "onehot" | "label";
  test_size: number;
}

export interface TrainingConfig {
  dataset_id: string;
  target_column: string;
  feature_columns: string[];
  task_type: "classification" | "regression";
  preprocessing: PreprocessingConfig;
  algorithms: string[];
  cross_validation_folds: number;
  hyperparameter_tuning: boolean;
}

export interface ModelResult {
  name: string;
  metrics: Record<string, number>;
  is_best: boolean;
}

export interface TrainingResults {
  training_id: string;
  task_type: string;
  models: ModelResult[];
}

export interface TrainingProgress {
  training_id: string;
  status: "pending" | "training" | "complete" | "error";
  current_model?: string;
  progress: number;
  message?: string;
}

export interface ConfusionMatrixData {
  matrix: number[][];
  labels: string[];
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}
