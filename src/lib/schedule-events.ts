import { parseTime } from "./time";
import type { DayNumber, ScheduleItem, ScoredSchedule } from "./types";

export interface ScheduleEvent {
  day: DayNumber;
  time: string;
  room: string;
  course: string;
  subjectCode: string;
  group: string;
  lecturer: string;
  start: number;
}

function createEmptyByDay(): Record<DayNumber, ScheduleEvent[]> {
  return {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
  };
}

export function collectScheduleEvents(items: ScheduleItem[]): Record<DayNumber, ScheduleEvent[]> {
  const byDay = createEmptyByDay();
  for (const item of items) {
    for (const t of item.group.times) {
      const parsed = parseTime(t.time);
      if (!parsed) continue;
      byDay[t.day].push({
        day: t.day,
        time: t.time,
        room: t.room ?? "",
        course: item.course.courseName,
        subjectCode: item.course.subjectCode ?? "",
        group: item.group.name,
        lecturer: item.group.lecturer,
        start: parsed.start,
      });
    }
  }
  for (const day of Object.keys(byDay) as unknown as DayNumber[]) {
    byDay[day].sort((a, b) => a.start - b.start);
  }
  return byDay;
}

export function collectScoredScheduleEvents(
  schedule: ScoredSchedule,
): Record<DayNumber, ScheduleEvent[]> {
  return collectScheduleEvents(schedule.schedule);
}
