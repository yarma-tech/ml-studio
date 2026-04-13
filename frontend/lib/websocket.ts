import type { TrainingProgress } from "./types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export function connectTrainingWS(
  trainingId: string,
  onMessage: (data: TrainingProgress) => void,
  onError?: (error: Event) => void,
): () => void {
  try {
    const ws = new WebSocket(`${WS_BASE}/ws/training/${trainingId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onerror = (event) => {
      onError?.(event);
    };

    return () => ws.close();
  } catch {
    // WebSocket blocked (mixed content: ws:// from https:// page)
    // Polling fallback in TrainingProgress.tsx handles progress updates
    return () => {};
  }
}
