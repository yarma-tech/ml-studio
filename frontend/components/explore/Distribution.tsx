"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getDistribution } from "@/lib/api";
import { useStepper } from "@/components/stepper/StepperContext";
import type { DistributionData } from "@/lib/types";
import Card from "@/components/ui/Card";

export default function Distribution() {
  const { dataset } = useStepper();
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<DistributionData | null>(null);

  useEffect(() => {
    if (dataset && dataset.column_names.length > 0) setSelected(dataset.column_names[0]);
  }, [dataset]);

  useEffect(() => {
    if (!dataset || !selected) return;
    getDistribution(dataset.dataset_id, selected).then(setData);
  }, [dataset, selected]);

  if (!dataset) return null;

  return (
    <Card title="Distribution">
      <div className="mb-4">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          {dataset.column_names.map((col) => (<option key={col} value={col}>{col}</option>))}
        </select>
      </div>
      {data && (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.bins}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
