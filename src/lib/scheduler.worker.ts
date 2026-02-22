import { generateSchedules } from './scheduler.ts';
import type { SchedulerOptions } from './scheduler.ts';
import type { Course } from '../types.ts';

self.onmessage = (e: MessageEvent<{ courses: Course[]; options: SchedulerOptions }>) => {
  const { courses, options } = e.data;
  const result = generateSchedules(courses, options);
  self.postMessage(result);
};

