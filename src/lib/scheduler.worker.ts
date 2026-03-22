import type { SchedulerOptions } from "./scheduler";
import { generateSchedules } from "./scheduler";
import type { Course } from "./types";

self.onmessage = (
  e: MessageEvent<{ courses: Course[]; options: SchedulerOptions }>,
) => {
  const { courses, options } = e.data;
  const result = generateSchedules(courses, options);
  self.postMessage(result);
};
