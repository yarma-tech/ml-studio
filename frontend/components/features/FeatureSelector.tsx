"use client";

import { useEffect, useState } from "react";
import { useStepper } from "@/components/stepper/StepperContext";
import { getCorrelations, getSamples, describeColumns } from "@/lib/api";
import Card from "@/components/ui/Card";

function CorrelationBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 w-32">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium w-10 text-right">{value}%</span>
    </div>
  );
}

export default function FeatureSelector() {
  const { dataset, targetColumn, setTargetColumn, featureColumns, setFeatureColumns, taskType, setTaskType } = useStepper();
  const [correlations, setCorrelations] = useState<Record<string, number>>({});
  const [columnSamples, setColumnSamples] = useState<Record<string, string[]>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);

  useEffect(() => {
    if (!dataset || !targetColumn) return;
    const colType = dataset.column_types[targetColumn];
    setTaskType(colType === "categorical" ? "classification" : "regression");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, targetColumn]);

  useEffect(() => {
    if (dataset && !targetColumn && featureColumns.length === 0) {
      setFeatureColumns(dataset.column_names);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, targetColumn]);

  useEffect(() => {
    if (!dataset || !targetColumn) return;
    getCorrelations(dataset.dataset_id, targetColumn).then((data) => {
      setCorrelations(data.correlations);
    }).catch(() => setCorrelations({}));
  }, [dataset, targetColumn]);

  // Load samples immediately
  useEffect(() => {
    if (!dataset) return;
    getSamples(dataset.dataset_id).then((data) => {
      setColumnSamples(data.samples);
    }).catch(() => setColumnSamples({}));
  }, [dataset]);

  // Load AI descriptions in background
  useEffect(() => {
    if (!dataset) return;
    setLoadingDescriptions(true);
    describeColumns(dataset.dataset_id).then((data) => {
      setDescriptions(data.descriptions);
    }).catch(() => setDescriptions({})).finally(() => setLoadingDescriptions(false));
  }, [dataset]);

  if (!dataset) return null;

  const availableFeatures = dataset.column_names.filter((c) => c !== targetColumn);
  const allSelected = availableFeatures.every((c) => featureColumns.includes(c));

  const handleTargetChange = (col: string) => {
    setTargetColumn(col);
    setFeatureColumns(dataset.column_names.filter((c) => c !== col));
  };

  const toggleFeature = (col: string) => {
    if (featureColumns.includes(col)) setFeatureColumns(featureColumns.filter((c) => c !== col));
    else setFeatureColumns([...featureColumns, col]);
  };

  const toggleAll = () => {
    if (allSelected) setFeatureColumns([]);
    else setFeatureColumns(availableFeatures);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
        <Card title={`Features (${featureColumns.length}/${availableFeatures.length} sélectionnées)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" title={allSelected ? "Tout désélectionner" : "Tout sélectionner"} />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Feature</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Exemples</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Corrélation</th>
                </tr>
              </thead>
              <tbody>
                {availableFeatures.map((col) => (
                  <tr key={col} className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${featureColumns.includes(col) ? "" : "opacity-50"}`} onClick={() => toggleFeature(col)}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={featureColumns.includes(col)} onChange={() => toggleFeature(col)} className="rounded" onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{col}</div>
                      {descriptions[col] && (
                        <div className="text-xs text-blue-600 mt-0.5">🤖 {descriptions[col]}</div>
                      )}
                      {loadingDescriptions && !descriptions[col] && (
                        <div className="text-xs text-gray-400 mt-0.5 animate-pulse">Analyse IA...</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${dataset.column_types[col] === "numeric" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
                        {dataset.column_types[col] === "numeric" ? "num." : "cat."}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-40 truncate">
                      {columnSamples[col] ? columnSamples[col].join(", ") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {correlations[col] !== undefined ? <CorrelationBar value={correlations[col]} /> : <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-800 underline">
              {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
            <p className="text-xs text-gray-400">
              La corrélation indique la force du lien entre chaque feature et la cible. Plus le % est élevé, plus la feature est potentiellement utile.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
