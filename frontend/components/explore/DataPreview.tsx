"use client";

import { useEffect, useState } from "react";
import { getPreview } from "@/lib/api";
import { useStepper } from "@/components/stepper/StepperContext";
import Card from "@/components/ui/Card";

export default function DataPreview() {
  const { dataset } = useStepper();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    if (!dataset) return;
    getPreview(dataset.dataset_id).then((data) => {
      setRows(data.rows);
      setColumns(data.columns);
    });
  }, [dataset]);

  if (!dataset) return null;

  return (
    <Card title={`Aperçu — ${dataset.filename} (${dataset.rows} lignes)`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-blue-600">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-gray-700">{String(row[col] ?? "—")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
