from pydantic import BaseModel
from typing import Optional


class DatasetMetadata(BaseModel):
    dataset_id: str
    filename: str
    rows: int
    columns: int
    column_names: list[str]
    column_types: dict[str, str]
    missing_values: dict[str, int]


class ColumnStats(BaseModel):
    name: str
    dtype: str
    count: int
    missing: int
    unique: int
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    top_values: Optional[dict[str, int]] = None


class DistributionData(BaseModel):
    column: str
    dtype: str
    bins: list[dict]


class PreprocessingConfig(BaseModel):
    missing_strategy: str = "mean"
    scaling: str = "standard"
    encoding: str = "onehot"
    test_size: float = 0.2


class TrainingConfig(BaseModel):
    dataset_id: str
    target_column: str
    feature_columns: list[str]
    task_type: str
    preprocessing: PreprocessingConfig
    algorithms: list[str]
    cross_validation_folds: int = 5
    hyperparameter_tuning: bool = True


class TrainingStatus(BaseModel):
    training_id: str
    status: str
    current_model: Optional[str] = None
    progress: int = 0


class ModelResult(BaseModel):
    name: str
    metrics: dict[str, float]
    is_best: bool = False


class TrainingResults(BaseModel):
    training_id: str
    task_type: str
    models: list[ModelResult]


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: dict = {}
