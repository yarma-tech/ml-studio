"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadDataset } from "@/lib/api";
import { useStepper } from "@/components/stepper/StepperContext";

export default function UploadZone() {
  const { setDataset } = useStepper();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const metadata = await uploadDataset(files[0]);
      setDataset(metadata);
    } catch (e: any) {
      setError(e.message || "Échec du chargement");
    } finally {
      setLoading(false);
    }
  }, [setDataset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div className="max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-rose-400 bg-rose-50" : "border-gray-300 hover:border-rose-400"
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <p className="text-gray-500">Chargement en cours...</p>
        ) : (
          <>
            <div className="text-4xl mb-4">📁</div>
            <p className="text-gray-600 font-medium">Glisser-déposer un fichier CSV ou Excel</p>
            <p className="text-gray-500 text-sm mt-2">ou cliquer pour parcourir</p>
            <p className="text-gray-500 text-xs mt-4">Formats : .csv, .xlsx, .xls — Max 50 Mo</p>
          </>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
    </div>
  );
}
