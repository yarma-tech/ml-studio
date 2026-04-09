"use client";

import { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Card from "@/components/ui/Card";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props { trainingId: string; modelName?: string; }

export default function PredictionsChart({ trainingId, modelName }: Props) {
  const [data, setData] = useState<{ actual: number; predicted: number }[]>([]);
  useEffect(() => {
    const params = modelName ? `?model_name=${modelName}` : "";
    fetch(`${API_BASE}/api/training/${trainingId}/predictions${params}`).then((r) => r.json()).then((d) => setData(d.predictions || []));
  }, [trainingId, modelName]);
  if (data.length === 0) return null;

  return (
    <Card title="Prédictions vs Réel">
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <XAxis type="number" dataKey="actual" name="Réel" tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="predicted" name="Prédit" tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill="#3b82f6" />
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}
