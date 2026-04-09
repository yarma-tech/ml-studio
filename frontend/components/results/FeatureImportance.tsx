"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getFeatureImportance } from "@/lib/api";
import type { FeatureImportanceItem } from "@/lib/types";
import Card from "@/components/ui/Card";

interface Props { trainingId: string; modelName?: string; }

export default function FeatureImportance({ trainingId, modelName }: Props) {
  const [data, setData] = useState<FeatureImportanceItem[]>([]);
  useEffect(() => { getFeatureImportance(trainingId, modelName).then(setData); }, [trainingId, modelName]);
  if (data.length === 0) return null;

  return (
    <Card title="Importance des features">
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 35)}>
        <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} width={90} />
          <Tooltip />
          <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
