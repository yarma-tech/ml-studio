"use client";

import { useEffect, useState } from "react";
import { getConfusionMatrix } from "@/lib/api";
import type { ConfusionMatrixData } from "@/lib/types";
import Card from "@/components/ui/Card";

interface Props { trainingId: string; modelName?: string; }

export default function ConfusionMatrix({ trainingId, modelName }: Props) {
  const [data, setData] = useState<ConfusionMatrixData | null>(null);
  useEffect(() => { getConfusionMatrix(trainingId, modelName).then(setData); }, [trainingId, modelName]);
  if (!data) return null;
  const max = Math.max(...data.matrix.flat());

  return (
    <Card title="Matrice de confusion">
      <div className="overflow-x-auto">
        <table className="text-sm mx-auto">
          <thead><tr><th className="px-3 py-2"></th>{data.labels.map((label) => (<th key={label} className="px-3 py-2 text-center font-medium text-gray-500">Prédit: {label}</th>))}</tr></thead>
          <tbody>
            {data.matrix.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium text-gray-500">Réel: {data.labels[i]}</td>
                {row.map((val, j) => {
                  const intensity = max > 0 ? val / max : 0;
                  const isDiagonal = i === j;
                  return (<td key={j} className="px-3 py-2 text-center font-medium w-16 h-16" style={{ backgroundColor: isDiagonal ? `rgba(225, 29, 72, ${0.1 + intensity * 0.6})` : `rgba(239, 68, 68, ${intensity * 0.3})`, color: intensity > 0.5 ? "white" : "inherit" }}>{val}</td>);
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
