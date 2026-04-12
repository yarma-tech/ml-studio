"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { DatasetMetadata, PreprocessingConfig } from "@/lib/types";

interface StepperState {
  currentStep: number;
  dataset: DatasetMetadata | null;
  targetColumn: string | null;
  featureColumns: string[];
  taskType: "classification" | "regression" | null;
  preprocessing: PreprocessingConfig;
  algorithms: string[];
  crossValidationFolds: number;
  hyperparameterTuning: boolean;
  trainingId: string | null;
}

const defaultPreprocessing: PreprocessingConfig = {
  missing_strategy: "mean",
  scaling: "standard",
  encoding: "onehot",
  test_size: 0.2,
};

const defaultState: StepperState = {
  currentStep: 0,
  dataset: null,
  targetColumn: null,
  featureColumns: [],
  taskType: null,
  preprocessing: defaultPreprocessing,
  algorithms: [],
  crossValidationFolds: 5,
  hyperparameterTuning: true,
  trainingId: null,
};

interface StepperContextType extends StepperState {
  setStep: (step: number) => void;
  setDataset: (dataset: DatasetMetadata) => void;
  setTargetColumn: (column: string) => void;
  setFeatureColumns: (columns: string[]) => void;
  setTaskType: (type: "classification" | "regression") => void;
  setPreprocessing: (config: PreprocessingConfig) => void;
  setAlgorithms: (algos: string[]) => void;
  setCrossValidationFolds: (folds: number) => void;
  setHyperparameterTuning: (enabled: boolean) => void;
  setTrainingId: (id: string) => void;
  reset: () => void;
}

const StepperContext = createContext<StepperContextType | null>(null);

const STORAGE_KEY = "ml-studio-state";

export function StepperProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StepperState>(defaultState);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setState(JSON.parse(saved)); } catch {}
    }
    const params = new URLSearchParams(window.location.search);
    const trainingId = params.get("training");
    if (trainingId) {
      setState((prev) => ({ ...prev, trainingId }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const params = new URLSearchParams();
    if (state.dataset?.dataset_id) params.set("dataset", state.dataset.dataset_id);
    if (state.trainingId) params.set("training", state.trainingId);
    const url = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", url);
  }, [state]);

  const update = useCallback((partial: Partial<StepperState>) => setState((prev) => ({ ...prev, ...partial })), []);

  const setStep = useCallback((step: number) => update({ currentStep: step }), [update]);
  const setDataset = useCallback((dataset: DatasetMetadata) => update({ dataset, currentStep: 1 }), [update]);
  const setTargetColumn = useCallback((column: string) => update({ targetColumn: column }), [update]);
  const setFeatureColumns = useCallback((columns: string[]) => update({ featureColumns: columns }), [update]);
  const setTaskType = useCallback((type: "classification" | "regression") => update({ taskType: type }), [update]);
  const setPreprocessing = useCallback((config: PreprocessingConfig) => update({ preprocessing: config }), [update]);
  const setAlgorithms = useCallback((algos: string[]) => update({ algorithms: algos }), [update]);
  const setCrossValidationFolds = useCallback((folds: number) => update({ crossValidationFolds: folds }), [update]);
  const setHyperparameterTuning = useCallback((enabled: boolean) => update({ hyperparameterTuning: enabled }), [update]);
  const setTrainingId = useCallback((id: string) => update({ trainingId: id }), [update]);
  const reset = useCallback(() => { setState(defaultState); localStorage.removeItem(STORAGE_KEY); }, []);

  const value: StepperContextType = {
    ...state,
    setStep, setDataset, setTargetColumn, setFeatureColumns, setTaskType,
    setPreprocessing, setAlgorithms, setCrossValidationFolds, setHyperparameterTuning,
    setTrainingId, reset,
  };

  return <StepperContext.Provider value={value}>{children}</StepperContext.Provider>;
}

export function useStepper() {
  const ctx = useContext(StepperContext);
  if (!ctx) throw new Error("useStepper must be used within StepperProvider");
  return ctx;
}
