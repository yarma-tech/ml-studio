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

  const hasExistingTraining = !!trainingId;
  const isTrainingInProgress = hasExistingTraining && progress?.status === "training";
  const isError = progress?.status === "error";
  const showLaunchButton = !isTrainingInProgress && !launching;

  const launch = async () => {
    if (!dataset || !targetColumn || !taskType) return;
    setLaunching(true);
    setProgress(null);
    try {
      const { training_id } = await startTraining({
        dataset_id: dataset.dataset_id, target_column: targetColumn, feature_columns: featureColumns,
        task_type: taskType, preprocessing, algorithms, cross_validation_folds: crossValidationFolds, hyperparameter_tuning: hyperparameterTuning,
      });
      setTrainingId(training_id);
    } catch (e: unknown) {
      setProgress({ training_id: "", status: "error", progress: 0, message: e instanceof Error ? e.message : "Erreur lors du lancement" });
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
        if (status.status === "error") { clearInterval(interval); }
      } catch {
        // Backend unreachable or training not found — show error
        setProgress({ training_id: trainingId, status: "error", progress: 0, message: "Entraînement introuvable. Le serveur a peut-être redémarré." });
        clearInterval(interval);
      }
    }, 3000);
    return () => { disconnect(); clearInterval(interval); };
  }, [trainingId, setStep]);

  if (showLaunchButton) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        {isError && progress?.message && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
            {progress.message}
          </div>
        )}
        <p className="text-gray-600 mb-6">{algorithms.length} algorithme(s) sélectionné(s). Prêt à lancer l&apos;entraînement.</p>
        {hasExistingTraining && !isError && (
          <p className="text-sm text-orange-700 mb-4">Un entraînement précédent existe. Cliquez pour en relancer un nouveau.</p>
        )}
        <Button onClick={launch} disabled={algorithms.length === 0}>
          {hasExistingTraining ? "🔄 Relancer l\u2019entraînement" : "🚀 Lancer l\u2019entraînement"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card title="Entraînement en cours">
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{progress?.current_model || "Initialisation..."}</span>
            <span>{progress?.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress?.progress || 0}%` }} />
          </div>
        </div>
      </Card>
    </div>
  );
}
