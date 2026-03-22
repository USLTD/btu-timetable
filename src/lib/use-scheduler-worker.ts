import { useRef, useCallback } from 'react';
import type { Course, SchedulerResult } from '../types.ts';
import type { SchedulerOptions } from './scheduler.ts';

export function useSchedulerWorker() {
  const workerRef = useRef<Worker | null>(null);

  const run = useCallback((courses: Course[], options: SchedulerOptions): Promise<SchedulerResult> => {
    return new Promise((resolve, reject) => {
      try {
        // Terminate previous worker if still running
        workerRef.current?.terminate();

        const worker = new Worker(
          new URL('./scheduler.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = worker;

        worker.onmessage = (e: MessageEvent<SchedulerResult>) => {
          resolve(e.data);
          worker.terminate();
          workerRef.current = null;
        };
        worker.onerror = (err) => {
          reject(err);
          worker.terminate();
          workerRef.current = null;
        };

        worker.postMessage({ courses, options });
      } catch (err) {
        // Worker construction failed (e.g. not supported) — fallback to main thread
        if (err instanceof DOMException || err instanceof TypeError) {
          import('./scheduler.ts').then(({ generateSchedules }) => {
            resolve(generateSchedules(courses, options));
          }).catch(reject);
        } else {
          reject(err);
        }
      }
    });
  }, []);

  return { run };
}