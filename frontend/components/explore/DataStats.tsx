"use client";

import { useEffect, useState } from "react";
import { getStats } from "@/lib/api";
import { useStepper } from "@/components/stepper/StepperContext";
import type { ColumnStats } from "@/lib/types";
import Card from "@/components/ui/Card";

export default function DataStats() {
  const { dataset } = useStepper();
  const [stats, setStats] = useState<ColumnStats[]>([]);

  useEffect(() => {
    if (!dataset) return;
    getStats(dataset.dataset_id).then((data) => setStats(data.columns));
  }, [dataset]);

  if (!dataset) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><div className="text-center"><div className="text-2xl font-bold text-rose-600">{dataset.columns}</div><div className="text-xs text-gray-500 uppercase">Colonnes</div></div></Card>
        <Card><div className="text-center"><div className="text-2xl font-bold text-rose-600">{dataset.rows}</div><div className="text-xs text-gray-500 uppercase">Lignes</div></div></Card>
        <Card><div className="text-center"><div className="text-2xl font-bold text-orange-700">{Object.values(dataset.missing_values).reduce((a, b) => a + b, 0)}</div><div className="text-xs text-gray-500 uppercase">Valeurs manquantes</div></div></Card>
      </div>
      <Card title="Détail par colonne">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left font-medium text-gray-500">Colonne</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Uniques</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Manquantes</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Détail</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((col) => (
                <tr key={col.name} className="border-b border-gray-50">
                  <td className="px-3 py-2 font-medium">{col.name}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${col.dtype === "numeric" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>{col.dtype === "numeric" ? "numérique" : "catégoriel"}</span></td>
                  <td className="px-3 py-2 text-center">{col.unique}</td>
                  <td className="px-3 py-2 text-center">{col.missing > 0 ? <span className="text-orange-700">{col.missing}</span> : "0"}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{col.dtype === "numeric" ? `μ=${col.mean} σ=${col.std} [${col.min}–${col.max}]` : col.top_values ? Object.entries(col.top_values).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
