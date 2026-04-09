"use client";

import { useEffect } from "react";
import { useStepper } from "@/components/stepper/StepperContext";
import Card from "@/components/ui/Card";

export default function FeatureSelector() {
  const { dataset, targetColumn, setTargetColumn, featureColumns, setFeatureColumns, taskType, setTaskType } = useStepper();

  useEffect(() => {
    if (!dataset || !targetColumn) return;
    const colType = dataset.column_types[targetColumn];
    setTaskType(colType === "categorical" ? "classification" : "regression");
  }, [dataset, targetColumn, setTaskType]);

  useEffect(() => {
    if (dataset && !targetColumn) setFeatureColumns(dataset.column_names);
  }, [dataset, targetColumn, setFeatureColumns]);

  if (!dataset) return null;

  const handleTargetChange = (col: string) => {
    setTargetColumn(col);
    setFeatureColumns(dataset.column_names.filter((c) => c !== col));
  };

  const toggleFeature = (col: string) => {
    if (featureColumns.includes(col)) setFeatureColumns(featureColumns.filter((c) => c !== col));
    else setFeatureColumns([...featureColumns, col]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card title="Colonne cible (à prédire)">
        <select value={targetColumn || ""} onChange={(e) => handleTargetChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Sélectionner la colonne cible...</option>
          {dataset.column_names.map((col) => (<option key={col} value={col}>{col} ({dataset.column_types[col] === "numeric" ? "numérique" : "catégoriel"})</option>))}
        </select>
        {targetColumn && taskType && (
          <div className="mt-3 flex items-center gap-3">
            <span className={`text-sm px-3 py-1 rounded-full ${taskType === "classification" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
              {taskType === "classification" ? "Classification" : "Régression"}
            </span>
            <button onClick={() => setTaskType(taskType === "classification" ? "regression" : "classification")} className="text-xs text-gray-500 hover:text-blue-600 underline">Changer manuellement</button>
          </div>
        )}
      </Card>
      {targetColumn && (
        <Card title="Features (entrées du modèle)">
          <div className="space-y-2">
            {dataset.column_names.filter((c) => c !== targetColumn).map((col) => (
              <label key={col} className="flex items-center gap-3 py-1">
                <input type="checkbox" checked={featureColumns.includes(col)} onChange={() => toggleFeature(col)} className="rounded" />
                <span className="text-sm">{col}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${dataset.column_types[col] === "numeric" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>{dataset.column_types[col] === "numeric" ? "numérique" : "catégoriel"}</span>
              </label>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
