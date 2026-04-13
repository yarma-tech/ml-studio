"use client";

import { useStepper } from "@/components/stepper/StepperContext";
import Card from "@/components/ui/Card";

const CLASSIFICATION_ALGORITHMS = [
  { value: "random_forest", label: "Random Forest", desc: "Ensemble d'arbres de décision" },
  { value: "logistic_regression", label: "Régression Logistique", desc: "Modèle linéaire de classification" },
  { value: "svm", label: "SVM", desc: "Machine à vecteurs de support" },
  { value: "gradient_boosting", label: "Gradient Boosting", desc: "Boosting de gradient" },
];

const REGRESSION_ALGORITHMS = [
  { value: "random_forest", label: "Random Forest", desc: "Ensemble d'arbres de décision" },
  { value: "linear_regression", label: "Régression Linéaire", desc: "Modèle linéaire" },
  { value: "svr", label: "SVR", desc: "Régression à vecteurs de support" },
  { value: "gradient_boosting", label: "Gradient Boosting", desc: "Boosting de gradient" },
];

export default function AlgorithmPicker() {
  const { taskType, algorithms, setAlgorithms, crossValidationFolds, setCrossValidationFolds, hyperparameterTuning, setHyperparameterTuning } = useStepper();
  const available = taskType === "classification" ? CLASSIFICATION_ALGORITHMS : REGRESSION_ALGORITHMS;
  const toggle = (value: string) => {
    if (algorithms.includes(value)) setAlgorithms(algorithms.filter((a) => a !== value));
    else setAlgorithms([...algorithms, value]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card title="Algorithmes">
        <div className="space-y-3">
          {available.map((algo) => (
            <label key={algo.value} className="flex items-start gap-3 p-3 rounded-lg hover:bg-rose-50 cursor-pointer">
              <input type="checkbox" checked={algorithms.includes(algo.value)} onChange={() => toggle(algo.value)} className="mt-0.5 rounded accent-rose-600" />
              <div><div className="text-sm font-medium">{algo.label}</div><div className="text-xs text-gray-500">{algo.desc}</div></div>
            </label>
          ))}
        </div>
      </Card>
      <Card title="Options avancées">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={hyperparameterTuning} onChange={(e) => setHyperparameterTuning(e.target.checked)} className="rounded accent-rose-600" />
            <div><div className="text-sm font-medium">Optimisation des hyperparamètres (GridSearchCV)</div><div className="text-xs text-gray-500">Recherche automatique des meilleurs paramètres</div></div>
          </label>
          <div>
            <label className="text-sm font-medium">Validation croisée : {crossValidationFolds} plis</label>
            <input type="range" min={2} max={10} value={crossValidationFolds} onChange={(e) => setCrossValidationFolds(parseInt(e.target.value))} className="w-full mt-1" />
          </div>
        </div>
      </Card>
    </div>
  );
}
