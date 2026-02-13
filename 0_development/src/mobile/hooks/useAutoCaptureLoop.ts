import { useEffect } from "react";

interface UseAutoCaptureLoopOptions {
  enabled: boolean;
  ready: boolean;
  intervalMs: number;
  onTick: () => Promise<void>;
}

export function useAutoCaptureLoop({
  enabled,
  ready,
  intervalMs,
  onTick,
}: UseAutoCaptureLoopOptions): void {
  useEffect(() => {
    if (!enabled || !ready) {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const run = async () => {
      if (cancelled) {
        return;
      }
      await onTick();
      if (cancelled) {
        return;
      }
      timer = window.setTimeout(() => {
        void run();
      }, intervalMs);
    };

    timer = window.setTimeout(() => {
      void run();
    }, intervalMs);

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [enabled, intervalMs, onTick, ready]);
}
