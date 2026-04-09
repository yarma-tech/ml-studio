"use client";

import { getExportUrl } from "@/lib/api";
import type { ModelResult } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface Props { trainingId: string; models: ModelResult[]; }

export default function ModelExport({ trainingId, models }: Props) {
  return (
    <Card title="Exporter un modèle">
      <div className="flex flex-wrap gap-3">
        {models.map((model) => (
          <a key={model.name} href={getExportUrl(trainingId, model.name)} download>
            <Button variant={model.is_best ? "primary" : "outline"}>📥 {model.name.replace(/_/g, " ")}{model.is_best ? " (meilleur)" : ""}</Button>
          </a>
        ))}
      </div>
    </Card>
  );
}
