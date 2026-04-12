"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ComposedChart, Scatter, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MODEL_COLORS: Record<string, string> = {
  random_forest: "#3b82f6",
  linear_regression: "#10b981",
  gradient_boosting: "#f59e0b",
  svr: "#8b5cf6",
};

interface Props {
  trainingId: string;
  modelNames: string[];
}

export default function PredictionsChart({ trainingId, modelNames }: Props) {
  const [allPredictions, setAllPredictions] = useState<Record<string, { actual: number; predicted: number }[]>>({});
  const [visibleModels, setVisibleModels] = useState<Set<string>>(new Set(modelNames));

  useEffect(() => {
    setVisibleModels(new Set(modelNames));
    const fetchAll = async () => {
      const results: Record<string, { actual: number; predicted: number }[]> = {};
      for (const name of modelNames) {
        try {
          const resp = await fetch(`${API_BASE}/api/training/${trainingId}/predictions?model_name=${name}`);
          const data = await resp.json();
          results[name] = data.predictions || [];
        } catch { /* skip */ }
      }
      setAllPredictions(results);
    };
    fetchAll();
  }, [trainingId, modelNames]);

  // Build chart data: actual values as scatter + each model's prediction line
  const { scatterData, lineDataByModel, range } = useMemo(() => {
    const first = Object.values(allPredictions)[0];
    if (!first || first.length === 0) return { scatterData: [], lineDataByModel: {}, range: { min: 0, max: 1 } };

    // Scatter = actual data points on diagonal reference
    const scatter = first.map((p) => ({ actual: p.actual, y: p.actual }));

    // For each model, sort predictions by actual value for a clean line
    const lines: Record<string, { actual: number; predicted: number }[]> = {};
    for (const [name, preds] of Object.entries(allPredictions)) {
      lines[name] = [...preds].sort((a, b) => a.actual - b.actual);
    }

    // Range for reference line
    const allVals = first.flatMap((p) => [p.actual, ...Object.values(allPredictions).map((preds) => preds.find((pp) => pp.actual === p.actual)?.predicted ?? p.actual)]).flat();
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);

    return { scatterData: scatter, lineDataByModel: lines, range: { min, max } };
  }, [allPredictions]);

  // Merge all model predictions into one dataset sorted by actual
  const mergedData = useMemo(() => {
    const first = Object.values(allPredictions)[0];
    if (!first) return [];

    const sorted = [...first].map((_, i) => i).sort((a, b) => first[a].actual - first[b].actual);

    const points = sorted.map((i) => {
      const point: Record<string, number | undefined> = { actual: first[i].actual };
      for (const [name, preds] of Object.entries(allPredictions)) {
        point[name] = preds[i]?.predicted ?? 0;
      }
      return point;
    });

    // Add diagonal endpoints for the y=x line (only these 2 points have __diagonal)
    if (points.length > 0) {
      points.unshift({ actual: range.min, __diagonal: range.min });
      points.push({ actual: range.max, __diagonal: range.max });
    }

    return points;
  }, [allPredictions, range]);

  const toggleModel = (name: string) => {
    setVisibleModels((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (mergedData.length === 0) return null;

  return (
    <Card title="Prédictions vs Valeurs réelles">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={mergedData} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <XAxis
            type="number" dataKey="actual" tick={{ fontSize: 11 }}
            label={{ value: "Valeur réelle", position: "bottom", fontSize: 12, fill: "#6b7280", offset: 10 }}
          />
          <YAxis
            type="number" tick={{ fontSize: 11 }}
            label={{ value: "Valeur prédite", angle: -90, position: "insideLeft", fontSize: 12, fill: "#6b7280" }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "__diagonal") return [null, null];
              return [
                Number(value).toFixed(2),
                name === "actual" ? "Valeur réelle" : String(name).replace(/_/g, " "),
              ];
            }}
            labelFormatter={(label) => `Réel : ${Number(label).toFixed(2)}`}
          />

          {/* Perfect prediction line: y = x (straight diagonal) */}
          <Line
            dataKey="__diagonal"
            stroke="#1f2937"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
            legendType="none"
          />

          {/* Each model's prediction dots (scatter, no connecting lines) */}
          {modelNames.map((name) =>
            visibleModels.has(name) ? (
              <Scatter
                key={name}
                dataKey={name}
                fill={MODEL_COLORS[name] || "#6b7280"}
                r={4}
                legendType="none"
              />
            ) : null
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 justify-center">
        {/* Perfect line legend */}
        <span className="flex items-center gap-2 text-xs text-gray-600">
          <span className="w-5 border-t-2 border-gray-800 inline-block" />
          Prédiction parfaite (y = x)
        </span>

        {/* Model toggles */}
        {modelNames.map((name) => (
          <button
            key={name}
            onClick={() => toggleModel(name)}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all ${
              visibleModels.has(name)
                ? "border-gray-300 bg-white shadow-sm"
                : "border-gray-200 bg-gray-100 opacity-40"
            }`}
          >
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: MODEL_COLORS[name] || "#6b7280" }}
            />
            <span>{name.replace(/_/g, " ")}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-3">
        La ligne noire droite représente la prédiction parfaite (prédit = réel).
        Les points colorés montrent les prédictions de chaque modèle.
        Plus les points sont proches de la ligne droite, meilleur est le modèle.
        Cliquez sur un modèle dans la légende pour le masquer/afficher.
      </p>
    </Card>
  );
}
