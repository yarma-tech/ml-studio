"use client";

import { useEffect, useState } from "react";
import { useStepper } from "@/components/stepper/StepperContext";
import { startTraining, getTrainingStatus } from "@/lib/api";
import { connectTrainingWS } from "@/lib/websocket";
import type { TrainingProgress as ProgressType } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function TrainingProgress() {
  const { dataset, targetColumn, featureColumns, taskType, preprocessing, algorithms, crossValidationFolds, hyperparameterTuning, trainingId, setTrainingId, setStep } = useStepper();
  const [progress, setProgress] = useState<ProgressType | null>(null);
  const [launching, setLaunching] = useState(false);
  const [completedTrainingId, setCompletedTrainingId] = useState<string | null>(null);

  // Allow re-training: show the launch button if user is on step 4
  const hasExistingTraining = !!trainingId;
  const isTrainingInProgress = hasExistingTraining && progress?.status === "training";
  const showLaunchButton = !isTrainingInProgress && !launching;

  const launch = async () => {
    if (!dataset || !targetColumn || !taskType) return;
    setLaunching(true);
    try {
      const { training_id } = await startTraining({
        dataset_id: dataset.dataset_id, target_column: targetColumn, feature_columns: featureColumns,
        task_type: taskType, preprocessing, algorithms, cross_validation_folds: crossValidationFolds, hyperparameter_tuning: hyperparameterTuning,
      });
      setTrainingId(training_id);
    } catch (e: any) {
      setProgress({ training_id: "", status: "error", progress: 0, message: e.message });
    } finally {
      setLaunching(false);
    }
  };

  useEffect(() => {
    if (!trainingId) return;
    const disconnect = connectTrainingWS(trainingId, (data) => {
      setProgress(data);
      if (data.status === "complete") setStep(5);
    });
    const interval = setInterval(async () => {
      try {
        const status = await getTrainingStatus(trainingId);
        setProgress(status);
        if (status.status === "complete") { clearInterval(interval); setStep(5); }
      } catch {}
    }, 3000);
    return () => { disconnect(); clearInterval(interval); };
  }, [trainingId, setStep]);

  if (showLaunchButton) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <p className="text-gray-600 mb-6">{algorithms.length} algorithme(s) sélectionné(s). Prêt à lancer l&apos;entraînement.</p>
        {hasExistingTraining && (
          <p className="text-sm text-orange-500 mb-4">Un entraînement précédent existe. Cliquez pour en relancer un nouveau.</p>
        )}
        <Button onClick={launch} disabled={algorithms.length === 0}>
          {hasExistingTraining ? "🔄 Relancer un entraînement" : "🚀 Lancer l\u2019entraînement"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card title="Entraînement en cours">
        {progress?.status === "error" ? (
          <p className="text-red-500">{progress.message}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{progress?.current_model || "Initialisation..."}</span>
              <span>{progress?.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${progress?.progress || 0}%` }} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
