"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getFeatureImportance } from "@/lib/api";
import type { FeatureImportanceItem } from "@/lib/types";
import Card from "@/components/ui/Card";

const INITIAL_COUNT = 5;

interface Props { trainingId: string; modelName?: string; }

export default function FeatureImportance({ trainingId, modelName }: Props) {
  const [data, setData] = useState<FeatureImportanceItem[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { getFeatureImportance(trainingId, modelName).then(setData); }, [trainingId, modelName]);
  if (data.length === 0) return null;

  const visible = showAll ? data : data.slice(0, INITIAL_COUNT);
  const hasMore = data.length > INITIAL_COUNT;

  return (
    <Card title="Importance des features">
      <ResponsiveContainer width="100%" height={Math.max(200, visible.length * 35)}>
        <BarChart data={visible} layout="vertical" margin={{ left: 100 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} width={90} />
          <Tooltip />
          <Bar dataKey="importance" fill="#E11D48" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {hasMore && (
        <div className="text-center mt-3">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-rose-600 hover:text-rose-800 font-medium transition-colors"
          >
            {showAll ? "Afficher moins ↑" : `Afficher les ${data.length - INITIAL_COUNT} autres ↓`}
          </button>
        </div>
      )}
    </Card>
  );
}
