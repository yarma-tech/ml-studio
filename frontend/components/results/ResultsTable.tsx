"use client";

import type { ModelResult } from "@/lib/types";
import Card from "@/components/ui/Card";

interface Props { models: ModelResult[]; taskType: string; }

function getErrorPercent(model: ModelResult, taskType: string): string {
  if (taskType === "classification") {
    const accuracy = model.metrics["accuracy"] ?? 0;
    return ((1 - accuracy) * 100).toFixed(1) + "%";
  } else {
    // For regression, use 1 - R² as error indicator
    const r2 = model.metrics["r2"] ?? 0;
    const error = Math.max(0, (1 - r2) * 100);
    return error.toFixed(1) + "%";
  }
}

function getErrorColor(model: ModelResult, taskType: string): string {
  const errorVal = taskType === "classification"
    ? (1 - (model.metrics["accuracy"] ?? 0)) * 100
    : Math.max(0, (1 - (model.metrics["r2"] ?? 0)) * 100);
  if (errorVal <= 10) return "text-green-600";
  if (errorVal <= 30) return "text-orange-700";
  return "text-red-500";
}

const METRIC_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  accuracy: { label: "Précision globale", description: "Pourcentage de prédictions correctes parmi toutes les prédictions." },
  precision: { label: "Precision", description: "Parmi les prédictions positives, combien sont réellement positives." },
  recall: { label: "Rappel", description: "Parmi les cas réellement positifs, combien ont été correctement identifiés." },
  f1_score: { label: "F1-Score", description: "Moyenne harmonique de la Precision et du Rappel. Équilibre entre les deux." },
  r2: { label: "R² (Coefficient de détermination)", description: "Mesure la proportion de la variance expliquée par le modèle. 1.0 = parfait, 0 = aussi bon que la moyenne." },
  mae: { label: "MAE (Erreur Absolue Moyenne)", description: "Moyenne des écarts absolus entre prédictions et valeurs réelles. Plus c'est bas, mieux c'est." },
  rmse: { label: "RMSE (Racine de l'Erreur Quadratique Moyenne)", description: "Similaire au MAE mais pénalise davantage les grosses erreurs. Plus c'est bas, mieux c'est." },
};

export default function ResultsTable({ models, taskType }: Props) {
  const metricKeys = taskType === "classification" ? ["accuracy", "precision", "recall", "f1_score"] : ["r2", "mae", "rmse"];

  return (
    <div className="space-y-4">
      <Card title="Comparaison des modèles">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-500">Modèle</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">% Erreur</th>
              {metricKeys.map((key) => (<th key={key} className="px-3 py-2 text-center font-medium text-gray-500">{METRIC_DESCRIPTIONS[key]?.label.split(" (")[0] ?? key}</th>))}
            </tr></thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.name} className={model.is_best ? "bg-rose-50" : ""}>
                  <td className="px-3 py-2 font-medium">{model.is_best && "🏆 "}{model.name.replace(/_/g, " ")}</td>
                  <td className={`px-3 py-2 text-center font-bold ${getErrorColor(model, taskType)}`}>
                    {getErrorPercent(model, taskType)}
                  </td>
                  {metricKeys.map((key) => (
                    <td key={key} className={`px-3 py-2 text-center ${model.is_best ? "text-rose-700 font-semibold" : ""}`}>
                      {model.metrics[key]?.toFixed(2) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Best model summary */}
        {models.filter((m) => m.is_best).map((best) => (
          <div key={best.name} className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm">
            <span className="font-semibold text-rose-700">🏆 Meilleur modèle : {best.name.replace(/_/g, " ")}</span>
            <span className="text-gray-600"> — Taux d&apos;erreur de </span>
            <span className={`font-bold ${getErrorColor(best, taskType)}`}>{getErrorPercent(best, taskType)}</span>
            <span className="text-gray-600">
              {taskType === "classification"
                ? ` (${((best.metrics["accuracy"] ?? 0) * 100).toFixed(1)}% de prédictions correctes)`
                : ` (R² = ${best.metrics["r2"]?.toFixed(2) ?? "—"})`
              }
            </span>
          </div>
        ))}
      </Card>

      {/* Metrics legend */}
      <Card title="Lexique des métriques">
        <div className="grid gap-3">
          {metricKeys.map((key) => {
            const desc = METRIC_DESCRIPTIONS[key];
            if (!desc) return null;
            return (
              <div key={key} className="flex gap-3 items-start">
                <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded shrink-0">{desc.label.split(" (")[0]}</span>
                <p className="text-sm text-gray-600">{desc.description}</p>
              </div>
            );
          })}
          <div className="flex gap-3 items-start border-t border-gray-100 pt-3 mt-1">
            <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded shrink-0">% Erreur</span>
            <p className="text-sm text-gray-600">
              {taskType === "classification"
                ? "Pourcentage de prédictions incorrectes (100% - Précision). Plus c'est bas, meilleur est le modèle."
                : "Basé sur 1 - R² : représente la part de variance non expliquée par le modèle. Plus c'est bas, meilleur est le modèle."
              }
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
