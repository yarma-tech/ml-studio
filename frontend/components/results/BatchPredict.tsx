"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { predictBatch, getPredictionDownloadUrl } from "@/lib/api";
import type { ModelResult, BatchPredictionResult } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Props {
  trainingId: string;
  models: ModelResult[];
}

export default function BatchPredict({ trainingId, models }: Props) {
  const [selectedModel, setSelectedModel] = useState(
    models.find((m) => m.is_best)?.name || models[0]?.name
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchPredictionResult | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const data = await predictBatch(trainingId, files[0], selectedModel);
        setResult(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur lors de la prédiction");
      } finally {
        setLoading(false);
      }
    },
    [trainingId, selectedModel]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  return (
    <Card title="Prédiction par lot">
      <div className="space-y-4">
        {/* Model selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">Modèle :</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name.replace(/_/g, " ")}{m.is_best ? " (meilleur)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
          }`}
        >
          <input {...getInputProps()} />
          {loading ? (
            <p className="text-gray-500">Prédiction en cours...</p>
          ) : (
            <>
              <p className="text-gray-600 text-sm font-medium">
                Glisser-déposer un fichier CSV à prédire
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Mêmes colonnes que l&apos;entraînement, sans la colonne cible
              </p>
            </>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Results table */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {result.total_rows} prédiction{result.total_rows > 1 ? "s" : ""}
              </p>
              <a href={getPredictionDownloadUrl(trainingId)} download>
                <Button variant="outline">Télécharger CSV</Button>
              </a>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {result.columns.map((col) => (
                      <th
                        key={col}
                        className={`px-3 py-2 text-left font-medium ${
                          col === "prediction" ? "text-blue-700 bg-blue-50" : "text-gray-500"
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {result.columns.map((col) => (
                        <td
                          key={col}
                          className={`px-3 py-2 ${
                            col === "prediction" ? "font-semibold text-blue-700 bg-blue-50/50" : "text-gray-700"
                          }`}
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 50 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  Affichage limité aux 50 premières lignes — téléchargez le CSV pour voir tout
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
