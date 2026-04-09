"use client";

import { useStepper } from "./StepperContext";

const STEPS = [
  { label: "Charger", icon: "📁" },
  { label: "Explorer", icon: "🔍" },
  { label: "Cible", icon: "🎯" },
  { label: "Préparer", icon: "⚙️" },
  { label: "Entraîner", icon: "🚀" },
  { label: "Résultats", icon: "📊" },
];

export default function Stepper() {
  const { currentStep, setStep } = useStepper();

  return (
    <div className="flex items-center justify-center gap-2 py-6 flex-wrap">
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            onClick={() => i <= currentStep && setStep(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              i === currentStep
                ? "bg-blue-600 text-white"
                : i < currentStep
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            disabled={i > currentStep}
          >
            <span>{step.icon}</span>
            <span>{step.label}</span>
          </button>
          {i < STEPS.length - 1 && <span className="text-gray-300">→</span>}
        </div>
      ))}
    </div>
  );
}
