"use client";

import { useEffect, useState } from "react";
import { StepperProvider, useStepper } from "@/components/stepper/StepperContext";
import Stepper from "@/components/stepper/Stepper";
import UploadZone from "@/components/upload/UploadZone";
import DataPreview from "@/components/explore/DataPreview";
import DataStats from "@/components/explore/DataStats";
import Distribution from "@/components/explore/Distribution";
import FeatureSelector from "@/components/features/FeatureSelector";
import PreprocessingConfig from "@/components/preparation/PreprocessingConfig";
import AlgorithmPicker from "@/components/training/AlgorithmPicker";
import TrainingProgress from "@/components/training/TrainingProgress";
import ResultsTable from "@/components/results/ResultsTable";
import ConfusionMatrix from "@/components/results/ConfusionMatrix";
import PredictionsChart from "@/components/results/PredictionsChart";
import FeatureImportance from "@/components/results/FeatureImportance";
import ModelExport from "@/components/results/ModelExport";
import Button from "@/components/ui/Button";
import { getTrainingResults } from "@/lib/api";
import type { TrainingResults } from "@/lib/types";

function StudioContent() {
  const { currentStep, setStep, targetColumn, featureColumns, algorithms, trainingId, taskType } = useStepper();
  const [results, setResults] = useState<TrainingResults | null>(null);

  useEffect(() => {
    if (currentStep === 5 && trainingId) {
      getTrainingResults(trainingId).then(setResults);
    }
  }, [currentStep, trainingId]);

  const canNext = () => {
    if (currentStep === 2) return !!targetColumn && featureColumns.length > 0;
    if (currentStep === 4) return algorithms.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-center mb-2">ML Studio</h1>
        <p className="text-gray-500 text-center text-sm mb-8">Entraînez vos modèles en quelques clics</p>
        <Stepper />
        <div className="mt-8">
          {currentStep === 0 && <UploadZone />}
          {currentStep === 1 && (<div className="space-y-6"><DataPreview /><DataStats /><Distribution /></div>)}
          {currentStep === 2 && <FeatureSelector />}
          {currentStep === 3 && <PreprocessingConfig />}
          {currentStep === 4 && (<div className="space-y-6"><AlgorithmPicker /><TrainingProgress /></div>)}
          {currentStep === 5 && results && (
            <div className="space-y-6">
              <ResultsTable models={results.models} taskType={results.task_type} />
              {results.task_type === "classification" && trainingId && <ConfusionMatrix trainingId={trainingId} />}
              {results.task_type === "regression" && trainingId && <PredictionsChart trainingId={trainingId} />}
              {trainingId && <FeatureImportance trainingId={trainingId} />}
              {trainingId && <ModelExport trainingId={trainingId} models={results.models} />}
            </div>
          )}
        </div>
        {currentStep > 0 && currentStep < 5 && (
          <div className="flex justify-between mt-8">
            <Button variant="secondary" onClick={() => setStep(currentStep - 1)}>← Précédent</Button>
            {currentStep < 4 && (<Button onClick={() => setStep(currentStep + 1)} disabled={!canNext()}>Suivant →</Button>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (<StepperProvider><StudioContent /></StepperProvider>);
}
