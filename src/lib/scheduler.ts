import type { BusyPeriod, Course, DayNumber, DaySettings, GapSegment, Group, InstructorPref, MinMax, RejectionReason, ScheduleItem, SchedulerResult, ScoredSchedule, TimeSlot } from '../types.ts';
import { parseTime } from './time.ts';

function hasOverlap(schedule: ScheduleItem[], newGroup: Group, overlapLimit: number): { overlaps: boolean; conflictItem?: ScheduleItem } {
  for (const item of schedule) {
    for (const t1 of item.group.times) {
      for (const t2 of newGroup.times) {
        if (t1.day === t2.day) {
          const time1 = parseTime(t1.time);
          const time2 = parseTime(t2.time);
          if (!time1 || !time2) continue;
          const overlapStart = Math.max(time1.start, time2.start);
          const overlapEnd = Math.min(time1.end, time2.end);
          if (overlapEnd - overlapStart > overlapLimit) return { overlaps: true, conflictItem: item };
        }
      }
    }
  }
  return { overlaps: false };
}

/** Check if a parsed class time overlaps with any busy period on that day. */
function overlapsBusy(start: number, end: number, busyPeriods: BusyPeriod[] | undefined): boolean {
  if (!busyPeriods || busyPeriods.length === 0) return false;
  for (const bp of busyPeriods) {
    if (start < bp.end && end > bp.start) return true;
  }
  return false;
}

export interface SchedulerOptions {
  daySettings: DaySettings;
  classesPerDay: MinMax;
  maxOverlap: number;
  dailyCommute: MinMax;
  maxResults: number;
  instructorPrefs?: InstructorPref[];
}

export function generateSchedules(courses: Course[], options: SchedulerOptions): SchedulerResult {
  const { daySettings, classesPerDay, maxOverlap, dailyCommute, maxResults, instructorPrefs } = options;

  // Feature 8: sort by order field
  const activeCourses = courses.filter(c => c.isActive).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (activeCourses.length === 0) return { schedules: [], limitReached: false, rejections: [] };

  const allValid: ScheduleItem[][] = [];
  const rejections: RejectionReason[] = [];
  const seenRejections = new Set<string>();
  const MAX_COMBINATIONS = 100000;
  let limitReached = false;

  const addRejection = (r: RejectionReason) => {
    const key = JSON.stringify(r);
    if (!seenRejections.has(key)) {
      seenRejections.add(key);
      rejections.push(r);
    }
  };

  const dfs = (courseIdx: number, currentSched: ScheduleItem[], dayCounts: Record<number, number>) => {
    if (allValid.length >= MAX_COMBINATIONS) { limitReached = true; return; }

    if (courseIdx === activeCourses.length) {
      for (let d = 1; d <= 7; d++) {
        if (dayCounts[d] > 0 && dayCounts[d] < classesPerDay.min) {
          addRejection({ type: 'min_classes', day: d as DayNumber });
          return;
        }
      }
      allValid.push([...currentSched]);
      return;
    }

    const course = activeCourses[courseIdx];

    // Feature 5: group locking — only try the locked group if set
    const candidates = course.lockedGroup
      ? course.groups.filter(g => g.name === course.lockedGroup)
      : course.groups;

    for (const group of candidates) {
      let isInvalid = false;
      const tempCounts = { ...dayCounts };

      for (const t of group.times) {
        const ds = daySettings[t.day];
        if (ds.pref === 'disabled') {
          addRejection({ type: 'day_disabled', day: t.day, course: course.courseName, group: group.name });
          isInvalid = true; break;
        }
        const parsed = parseTime(t.time);
        if (!parsed || parsed.start < ds.min || parsed.end > ds.max) {
          addRejection({ type: 'outside_hours', day: t.day, course: course.courseName, group: group.name });
          isInvalid = true; break;
        }
        // Reject if class overlaps any busy period on this day
        if (overlapsBusy(parsed.start, parsed.end, ds.busyPeriods)) {
          addRejection({ type: 'busy_period', day: t.day, course: course.courseName, group: group.name });
          isInvalid = true; break;
        }
        tempCounts[t.day] = (tempCounts[t.day] || 0) + 1;
        if (tempCounts[t.day] > classesPerDay.max) {
          addRejection({ type: 'too_many_classes', day: t.day, course: course.courseName, group: group.name });
          isInvalid = true; break;
        }
      }

      if (isInvalid) continue;
      const { overlaps, conflictItem } = hasOverlap(currentSched, group, maxOverlap);
      if (!overlaps) {
        currentSched.push({ course, group });
        dfs(courseIdx + 1, currentSched, tempCounts);
        currentSched.pop();
      } else if (conflictItem) {
        addRejection({ type: 'overlap', course: course.courseName, group: group.name, conflictCourse: conflictItem.course.courseName, conflictGroup: conflictItem.group.name });
      }
    }
  };

  dfs(0, [], { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });

  const scored = allValid.map(sched => scoreSchedule(sched, daySettings, dailyCommute, instructorPrefs));
  scored.sort((a, b) => b.score - a.score);

  return { schedules: scored.slice(0, maxResults), limitReached, rejections };
}

/**
 * Given a pinned schedule, find schedules that differ by at most 1 group swap.
 * Re-scores and returns the top N neighbors.
 */
export function trySimilar(
  base: ScoredSchedule,
  courses: Course[],
  options: SchedulerOptions,
  maxNeighbors = 10,
): ScoredSchedule[] {
  const { daySettings, classesPerDay, maxOverlap, dailyCommute, instructorPrefs } = options;
  const neighbors: ScoredSchedule[] = [];

  for (let i = 0; i < base.schedule.length; i++) {
    const item = base.schedule[i];
    const course = courses.find(c => c.courseName === item.course.courseName);
    if (!course) continue;

    for (const altGroup of course.groups) {
      if (altGroup.name === item.group.name) continue; // same group, skip

      // Build candidate schedule with this one swap
      const candidate: ScheduleItem[] = base.schedule.map((si, idx) =>
        idx === i ? { course: si.course, group: altGroup } : si
      );

      // Validate the candidate
      let valid = true;
      const dayCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

      for (const si of candidate) {
        for (const t of si.group.times) {
          const ds = daySettings[t.day];
          if (ds.pref === 'disabled') { valid = false; break; }
          const parsed = parseTime(t.time);
          if (!parsed || parsed.start < ds.min || parsed.end > ds.max) { valid = false; break; }
          if (overlapsBusy(parsed.start, parsed.end, ds.busyPeriods)) { valid = false; break; }
          dayCounts[t.day]++;
          if (dayCounts[t.day] > classesPerDay.max) { valid = false; break; }
        }
        if (!valid) break;
      }
      if (!valid) continue;

      // Check for overlaps between all pairs
      for (let a = 0; a < candidate.length && valid; a++) {
        for (let b = a + 1; b < candidate.length && valid; b++) {
          const { overlaps } = hasOverlap([candidate[a]], candidate[b].group, maxOverlap);
          if (overlaps) valid = false;
        }
      }
      if (!valid) continue;

      // Check min classes per day
      for (let d = 1; d <= 7; d++) {
        if (dayCounts[d] > 0 && dayCounts[d] < classesPerDay.min) { valid = false; break; }
      }
      if (!valid) continue;

      neighbors.push(scoreSchedule(candidate, daySettings, dailyCommute, instructorPrefs));
    }
  }

  neighbors.sort((a, b) => b.score - a.score);
  return neighbors.slice(0, maxNeighbors);
}

function scoreSchedule(sched: ScheduleItem[], daySettings: DaySettings, dailyCommute: MinMax, instructorPrefs?: InstructorPref[]): ScoredSchedule {
  const daysTracker: Record<number, { start: number; end: number; original: TimeSlot }[]> = {};
  for (const item of sched) {
    for (const t of item.group.times) {
      if (!daysTracker[t.day]) daysTracker[t.day] = [];
      const parsed = parseTime(t.time);
      if (parsed) daysTracker[t.day].push({ ...parsed, original: t });
    }
  }

  let workDaysOnCampus = 0;
  let daysOnCampus = 0;
  let totalGapTime = 0;
  const gaps: GapSegment[] = [];

  for (let day = 1; day <= 7; day++) {
    if (daysTracker[day]) {
      daysOnCampus++;
      if (day <= 5) workDaysOnCampus++;
      const times = daysTracker[day].sort((a, b) => a.start - b.start);
      for (let i = 1; i < times.length; i++) {
        const gap = times[i].start - times[i - 1].end;
        if (gap > 0) {
          totalGapTime += gap;
          gaps.push({ day: day as DayNumber, start: times[i - 1].end, end: times[i].start });
        }
      }
    }
  }

  const freeWeekdays = 5 - workDaysOnCampus;
  const avgGlobalCommute = (dailyCommute.min + dailyCommute.max) / 2;

  // Use per-day commute when available, otherwise fall back to global
  let totalCommuteTime = 0;
  for (let day = 1; day <= 7; day++) {
    if (daysTracker[day]) {
      const ds = daySettings[day as DayNumber];
      totalCommuteTime += ds.commute ?? avgGlobalCommute;
    }
  }

  let score = freeWeekdays * 1000;
  for (let day = 1; day <= 7; day++) {
    const key = day as DayNumber;
    if (!daysTracker[day] && daySettings[key].pref === 'prioritize') score += 1000;
  }
  score -= daysOnCampus * 1000;
  score -= totalCommuteTime * 500;
  score -= (totalGapTime / 60) * 50;

  // Feature 6: instructor preference scoring
  if (instructorPrefs && instructorPrefs.length > 0) {
    for (const item of sched) {
      const pref = instructorPrefs.find(p => p.instructor === item.group.instructor);
      if (pref) {
        if (pref.weight === 'prefer') score += 200;
        else if (pref.weight === 'avoid') score -= 300;
      }
    }
  }

  const freeDays: DayNumber[] = [];
  for (let i = 1; i <= 5; i++) {
    if (!daysTracker[i]) freeDays.push(i as DayNumber);
  }

  return {
    schedule: sched,
    score,
    freeWeekdays,
    daysOnCampus,
    freeDays,
    totalGapTime,
    weeklyCommute: totalCommuteTime,
    gaps,
  };
}

