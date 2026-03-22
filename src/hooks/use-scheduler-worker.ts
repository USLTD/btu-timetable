import { useRef, useCallback, useEffect } from "preact/hooks";
import type { Course, SchedulerResult } from "@/lib/types";
import type { SchedulerOptions } from "@/lib/scheduler";

export function useSchedulerWorker() {
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      busyRef.current = false;
    };
  }, []);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../lib/scheduler.worker.ts", import.meta.url),
        { type: "module" },
      );
    }
    return workerRef.current;
  }, []);

  const run = useCallback((courses: Course[], options: SchedulerOptions): Promise<SchedulerResult> => {
    return new Promise((resolve, reject) => {
      try {
        if (busyRef.current) {
          workerRef.current?.terminate();
          workerRef.current = null;
          busyRef.current = false;
        }

        const worker = getWorker();
        busyRef.current = true;

        function cleanup() {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
          busyRef.current = false;
        }

        function handleMessage(e: MessageEvent<SchedulerResult>) {
          cleanup();
          resolve(e.data);
        }

        function handleError(err: ErrorEvent) {
          cleanup();
          reject(err);
        }

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleError);
        worker.postMessage({ courses, options });
      } catch (err) {
        workerRef.current?.terminate();
        workerRef.current = null;
        busyRef.current = false;
        // Worker construction failed (e.g. not supported) — fallback to main thread
        if (err instanceof DOMException || err instanceof TypeError) {
          import("../lib/scheduler").then(({ generateSchedules }) => {
            resolve(generateSchedules(courses, options));
          }).catch(reject);
        } else {
          reject(err);
        }
      }
    });
  }, [getWorker]);

  return { run };
}
