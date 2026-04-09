"use client";

import type { ModelResult } from "@/lib/types";
import Card from "@/components/ui/Card";

interface Props { models: ModelResult[]; taskType: string; }

export default function ResultsTable({ models, taskType }: Props) {
  const metricKeys = taskType === "classification" ? ["accuracy", "precision", "recall", "f1_score"] : ["r2", "mae", "rmse"];
  const labels: Record<string, string> = { accuracy: "Précision", precision: "Precision", recall: "Rappel", f1_score: "F1-Score", r2: "R²", mae: "MAE", rmse: "RMSE" };

  return (
    <Card title="Comparaison des modèles">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200">
            <th className="px-3 py-2 text-left font-medium text-gray-500">Modèle</th>
            {metricKeys.map((key) => (<th key={key} className="px-3 py-2 text-center font-medium text-gray-500">{labels[key]}</th>))}
          </tr></thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.name} className={model.is_best ? "bg-blue-50" : ""}>
                <td className="px-3 py-2 font-medium">{model.is_best && "🏆 "}{model.name.replace(/_/g, " ")}</td>
                {metricKeys.map((key) => (<td key={key} className={`px-3 py-2 text-center ${model.is_best ? "text-blue-700 font-semibold" : ""}`}>{model.metrics[key]?.toFixed(4) ?? "—"}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
