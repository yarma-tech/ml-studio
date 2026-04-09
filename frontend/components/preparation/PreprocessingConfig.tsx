"use client";

import { useStepper } from "@/components/stepper/StepperContext";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";

export default function PreprocessingConfig() {
  const { preprocessing, setPreprocessing } = useStepper();
  const update = (key: string, value: string | number) => setPreprocessing({ ...preprocessing, [key]: value } as any);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card title="Gestion des valeurs manquantes">
        <Select value={preprocessing.missing_strategy} onChange={(e) => update("missing_strategy", e.target.value)} options={[
          { value: "mean", label: "Moyenne (numérique) / Mode (catégoriel)" },
          { value: "median", label: "Médiane (numérique) / Mode (catégoriel)" },
          { value: "mode", label: "Mode (toutes colonnes)" },
          { value: "drop", label: "Supprimer les lignes" },
        ]} />
      </Card>
      <Card title="Normalisation">
        <Select value={preprocessing.scaling} onChange={(e) => update("scaling", e.target.value)} options={[
          { value: "standard", label: "StandardScaler (moyenne=0, écart-type=1)" },
          { value: "minmax", label: "MinMaxScaler (0-1)" },
          { value: "none", label: "Aucune normalisation" },
        ]} />
      </Card>
      <Card title="Encodage catégoriel">
        <Select value={preprocessing.encoding} onChange={(e) => update("encoding", e.target.value)} options={[
          { value: "onehot", label: "One-Hot Encoding" },
          { value: "label", label: "Label Encoding" },
        ]} />
      </Card>
      <Card title="Ratio Train / Test">
        <div className="flex items-center gap-4">
          <input type="range" min={0.1} max={0.5} step={0.05} value={preprocessing.test_size} onChange={(e) => update("test_size", parseFloat(e.target.value))} className="flex-1" />
          <span className="text-sm font-medium w-24 text-right">{Math.round((1 - preprocessing.test_size) * 100)}% / {Math.round(preprocessing.test_size * 100)}%</span>
        </div>
      </Card>
    </div>
  );
}
