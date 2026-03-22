import { parseTime } from "./time";
import type {
  BusyPeriod,
  Course,
  DayNumber,
  DaySettings,
  GapSegment,
  Group,
  LecturerPref,
  LecturerWeight,
  MinMax,
  RejectionReason,
  SchedulerResult,
  ScoredSchedule,
  TimeSlot,
} from "./types";
import { getMockLecturerRating } from "./lecturer-ratings";

// --- INTERNAL FAST-TYPES ---
// These structures allow us to pre-calculate all string parsing and
// grouping operations ONCE before entering the deep recursion trees.
interface FastParsedTime {
  day: DayNumber;
  start: number;
  end: number;
  original: TimeSlot;
}

interface FastGroup {
  group: Group;
  parsedTimes: FastParsedTime[];
  timesByDay: FastParsedTime[][]; // O(1) direct index lookup for days 1-7
  dayCounts: number[]; // Count of classes per day for quick validation
}

interface FastCourse {
  course: Course;
  groups: FastGroup[];
}

interface FastScheduleItem {
  course: Course;
  group: FastGroup;
}
// ----------------------------

/** Fast key generator to replace JSON.stringify inside tight loops */
function getRejectionKey(r: RejectionReason): string {
  switch (r.type) {
    case "day_disabled":
      return `1|${r.day}|${r.course}|${r.group}`;
    case "outside_hours":
      return `2|${r.day}|${r.course}|${r.group}`;
    case "busy_period":
      return `3|${r.day}|${r.course}|${r.group}`;
    case "too_many_classes":
      return `4|${r.day}|${r.course}|${r.group}`;
    case "overlap":
      return `5|${r.course}|${r.group}|${r.conflictCourse}|${r.conflictGroup}`;
    case "min_classes":
      return `6|${r.day}`;
    case "low_rating":
      return `7|${r.course}|${r.group}`;
  }
}

/** Check if a parsed class time overlaps with any busy period on that day. */
function overlapsBusy(
  start: number,
  end: number,
  busyPeriods: BusyPeriod[] | undefined,
): boolean {
  if (!busyPeriods || busyPeriods.length === 0) return false;
  for (const bp of busyPeriods) {
    if (start < bp.end && end > bp.start) return true;
  }
  return false;
}

/** * Pre-parses and validates a single group against static time rules.
 * Runs only once per group instead of thousands of times during DFS.
 */
function parseAndValidateGroup(
  course: Course,
  group: Group,
  daySettings: DaySettings,
  classesPerDayMax: number,
  minRating?: number,
): FastGroup | { error: RejectionReason } {
  if (minRating && minRating > 0 && group.lecturer) {
    const rating = getMockLecturerRating(group.lecturer);
    if (rating && rating.rating < minRating) {
      return {
        error: {
          type: "low_rating",
          course: course.courseName,
          group: group.name,
        },
      };
    }
  }

  const parsedTimes: FastParsedTime[] = [];
  const timesByDay: FastParsedTime[][] = [[], [], [], [], [], [], [], []];
  const groupDayCounts = new Int32Array(8);

  for (const t of group.times) {
    const ds = daySettings[t.day];

    if (ds.pref === "disabled") {
      return {
        error: {
          type: "day_disabled",
          day: t.day,
          course: course.courseName,
          group: group.name,
        },
      };
    }

    const parsed = parseTime(t.time);
    if (!parsed || parsed.start < ds.min || parsed.end > ds.max) {
      return {
        error: {
          type: "outside_hours",
          day: t.day,
          course: course.courseName,
          group: group.name,
        },
      };
    }

    if (overlapsBusy(parsed.start, parsed.end, ds.busyPeriods)) {
      return {
        error: {
          type: "busy_period",
          day: t.day,
          course: course.courseName,
          group: group.name,
        },
      };
    }

    groupDayCounts[t.day]++;
    // Reject if this group *by itself* violates the max classes per day
    if (groupDayCounts[t.day] > classesPerDayMax) {
      return {
        error: {
          type: "too_many_classes",
          day: t.day,
          course: course.courseName,
          group: group.name,
        },
      };
    }

    const pt: FastParsedTime = {
      day: t.day,
      start: parsed.start,
      end: parsed.end,
      original: t,
    };
    parsedTimes.push(pt);
    timesByDay[t.day].push(pt);
  }

  return {
    group,
    parsedTimes,
    timesByDay,
    dayCounts: Array.from(groupDayCounts),
  };
}

/** * Hyper-fast overlap checker relying on pre-parsed arrays and O(1) day lookups.
 */
function fastHasOverlap(
  schedule: FastScheduleItem[],
  newGroup: FastGroup,
  overlapLimit: number,
): { overlaps: boolean; conflictItem?: FastScheduleItem } {
  for (const item of schedule) {
    for (const t1 of item.group.parsedTimes) {
      const dayMatches = newGroup.timesByDay[t1.day];
      if (dayMatches.length === 0) continue;

      for (const t2 of dayMatches) {
        const overlapStart = Math.max(t1.start, t2.start);
        const overlapEnd = Math.min(t1.end, t2.end);

        if (overlapEnd - overlapStart > overlapLimit) {
          return { overlaps: true, conflictItem: item };
        }
      }
    }
  }
  return { overlaps: false };
}

export interface SchedulerOptions {
  daySettings: DaySettings;
  classesPerDay: MinMax;
  maxOverlap: number;
  dailyCommute: MinMax;
  maxResults: number;
  lecturerPrefs?: LecturerPref[];
  minRating?: number;
}

// noinspection D
export function generateSchedules(
  courses: Course[],
  options: SchedulerOptions,
): SchedulerResult {
  const {
    daySettings,
    classesPerDay,
    maxOverlap,
    dailyCommute,
    maxResults,
    lecturerPrefs,
    minRating,
  } = options;

  const rejections: RejectionReason[] = [];
  const seenRejections = new Set<string>();
  const addRejection = (r: RejectionReason) => {
    const key = getRejectionKey(r);
    if (!seenRejections.has(key)) {
      seenRejections.add(key);
      rejections.push(r);
    }
  };

  // 1. AOT PRE-PROCESSING
  const activeCourses = courses
    .filter((c) => c.isActive)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (activeCourses.length === 0) {
    return { schedules: [], limitReached: false, rejections: [] };
  }

  const fastCourses: FastCourse[] = [];

  for (const course of activeCourses) {
    const validGroups: FastGroup[] = [];
    const candidates = course.lockedGroup
      ? course.groups.filter((g) => g.name === course.lockedGroup)
      : course.groups.filter((g) => !course.excludedGroups?.includes(g.name));

    for (const group of candidates) {
      const result = parseAndValidateGroup(
        course,
        group,
        daySettings,
        classesPerDay.max,
        minRating,
      );
      if ("error" in result) {
        addRejection(result.error);
      } else {
        validGroups.push(result);
      }
    }

    // If a mandatory course has 0 valid groups, the entire schedule is strictly impossible.
    if (validGroups.length === 0) {
      return { schedules: [], limitReached: false, rejections };
    }

    fastCourses.push({ course, groups: validGroups });
  }

  // 2. DFS BACKTRACKING
  const allValid: FastScheduleItem[][] = [];
  const MAX_COMBINATIONS = 100000;
  let limitReached = false;

  // Reuse a single array instance instead of allocating thousands of objects via spread syntax
  const currentDayCounts = new Int32Array(8);

  // noinspection D
  const dfs = (courseIdx: number, currentSched: FastScheduleItem[]) => {
    if (allValid.length >= MAX_COMBINATIONS) {
      limitReached = true;
      return;
    }

    if (courseIdx === fastCourses.length) {
      // Final min-classes check
      for (let d = 1; d <= 7; d++) {
        if (
          currentDayCounts[d] > 0 &&
          currentDayCounts[d] < classesPerDay.min
        ) {
          addRejection({ type: "min_classes", day: d as DayNumber });
          return;
        }
      }
      allValid.push(currentSched.slice()); // Clone successful array
      return;
    }

    const fCourse = fastCourses[courseIdx];

    for (const fGroup of fCourse.groups) {
      // Verify limits *before* applying
      let exceedsMax = false;
      let rejectDay = 0;
      for (let d = 1; d <= 7; d++) {
        if (
          fGroup.dayCounts[d] > 0 &&
          currentDayCounts[d] + fGroup.dayCounts[d] > classesPerDay.max
        ) {
          exceedsMax = true;
          rejectDay = d;
          break;
        }
      }

      if (exceedsMax) {
        addRejection({
          type: "too_many_classes",
          day: rejectDay as DayNumber,
          course: fCourse.course.courseName,
          group: fGroup.group.name,
        });
        continue;
      }

      const { overlaps, conflictItem } = fastHasOverlap(
        currentSched,
        fGroup,
        maxOverlap,
      );

      if (overlaps) {
        if (conflictItem) {
          addRejection({
            type: "overlap",
            course: fCourse.course.courseName,
            group: fGroup.group.name,
            conflictCourse: conflictItem.course.courseName,
            conflictGroup: conflictItem.group.group.name,
          });
        }
        continue;
      }

      // Apply
      for (let d = 1; d <= 7; d++) currentDayCounts[d] += fGroup.dayCounts[d];
      currentSched.push({ course: fCourse.course, group: fGroup });

      dfs(courseIdx + 1, currentSched);

      // Revert (Backtrack step)
      currentSched.pop();
      for (let d = 1; d <= 7; d++) currentDayCounts[d] -= fGroup.dayCounts[d];
    }
  };

  dfs(0, []);

  // 3. SCORING
  const lecturerPrefMap = new Map<string, LecturerWeight>();
  if (lecturerPrefs) {
    for (const p of lecturerPrefs) lecturerPrefMap.set(p.lecturer, p.weight);
  }

  const scored = allValid.map((sched) =>
    fastScoreSchedule(sched, daySettings, dailyCommute, lecturerPrefMap),
  );
  scored.sort((a, b) => b.score - a.score);

  return { schedules: scored.slice(0, maxResults), limitReached, rejections };
}

// noinspection D
export function trySimilar(
  base: ScoredSchedule,
  courses: Course[],
  options: SchedulerOptions,
  maxNeighbors = 10,
): ScoredSchedule[] {
  const {
    daySettings,
    classesPerDay,
    maxOverlap,
    dailyCommute,
    lecturerPrefs,
    minRating,
  } = options;

  // Pre-parse the base schedule
  const baseFastSched: FastScheduleItem[] = [];
  for (const item of base.schedule) {
    const course = courses.find((c) => c.courseName === item.course.courseName);
    if (!course) return []; // Fallback safety
    const fg = parseAndValidateGroup(
      course,
      item.group,
      daySettings,
      classesPerDay.max,
      minRating,
    );
    if ("error" in fg) return []; // Fallback safety
    baseFastSched.push({ course: item.course, group: fg as FastGroup });
  }

  const neighbors: FastScheduleItem[][] = [];

  for (let i = 0; i < baseFastSched.length; i++) {
    const item = baseFastSched[i];
    const course = courses.find((c) => c.courseName === item.course.courseName);
    if (!course) continue;

    for (const altGroup of course.groups) {
      if (altGroup.name === item.group.group.name) continue;
      if (course.excludedGroups?.includes(altGroup.name)) continue;

      const fg = parseAndValidateGroup(
        course,
        altGroup,
        daySettings,
        classesPerDay.max,
        minRating,
      );
      if ("error" in fg) continue;

      const fastAltGroup = fg as FastGroup;

      // Swap out the single class
      const candidate = [...baseFastSched];
      candidate[i] = { course, group: fastAltGroup };

      // Validate daily counts
      let valid = true;
      const dayCounts = new Int32Array(8);

      for (const si of candidate) {
        for (let d = 1; d <= 7; d++) dayCounts[d] += si.group.dayCounts[d];
      }

      for (let d = 1; d <= 7; d++) {
        if (dayCounts[d] > classesPerDay.max) valid = false;
        if (dayCounts[d] > 0 && dayCounts[d] < classesPerDay.min) valid = false;
      }
      if (!valid) continue;

      // Validate Overlaps: Since we only swapped ONE group, we only need to check
      // the new group against the remaining O(N) groups instead of an O(N^2) pairwise check.
      let hasOverlap = false;
      for (let j = 0; j < candidate.length; j++) {
        if (i === j) continue;
        const res = fastHasOverlap([candidate[j]], fastAltGroup, maxOverlap);
        if (res.overlaps) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        neighbors.push(candidate);
      }
    }
  }

  const lecturerPrefMap = new Map<string, LecturerWeight>();
  if (lecturerPrefs) {
    for (const p of lecturerPrefs) lecturerPrefMap.set(p.lecturer, p.weight);
  }

  const scored = neighbors.map((sched) =>
    fastScoreSchedule(sched, daySettings, dailyCommute, lecturerPrefMap),
  );
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxNeighbors);
}

// noinspection D
/**
 * Uses the pre-parsed times to execute the complex scoring logic in fractions of a millisecond.
 */
function fastScoreSchedule(
  sched: FastScheduleItem[],
  daySettings: DaySettings,
  dailyCommute: MinMax,
  lecturerPrefMap: Map<string, LecturerWeight>,
): ScoredSchedule {
  const daysTracker: FastParsedTime[][] = [[], [], [], [], [], [], [], []];

  for (const item of sched) {
    for (const t of item.group.parsedTimes) {
      daysTracker[t.day].push(t);
    }
  }

  let workDaysOnCampus = 0;
  let daysOnCampus = 0;
  let totalGapTime = 0;
  let totalCommuteTime = 0;
  const gaps: GapSegment[] = [];
  const avgGlobalCommute = (dailyCommute.min + dailyCommute.max) / 2;

  for (let day = 1; day <= 7; day++) {
    const times = daysTracker[day];

    if (times.length > 0) {
      daysOnCampus++;
      if (day <= 5) workDaysOnCampus++;

      times.sort((a, b) => a.start - b.start);

      for (let i = 1; i < times.length; i++) {
        const gap = times[i].start - times[i - 1].end;
        if (gap > 0) {
          totalGapTime += gap;
          gaps.push({
            day: day as DayNumber,
            start: times[i - 1].end,
            end: times[i].start,
          });
        }
      }

      const ds = daySettings[day as DayNumber];
      totalCommuteTime += ds.commute ?? avgGlobalCommute;
    }
  }

  const freeWeekdays = 5 - workDaysOnCampus;

  let score = freeWeekdays * 1000;
  for (let day = 1; day <= 7; day++) {
    if (
      daysTracker[day].length === 0 &&
      daySettings[day as DayNumber].pref === "prioritize"
    ) {
      score += 1000;
    }
  }

  score -= daysOnCampus * 1000;
  score -= totalCommuteTime * 500;
  score -= (totalGapTime / 60) * 50;

  if (lecturerPrefMap.size > 0) {
    for (const item of sched) {
      const weight = lecturerPrefMap.get(item.group.group.lecturer);
      if (weight === "prefer") score += 200;
      else if (weight === "avoid") score -= 300;
    }
  }

  const freeDays: DayNumber[] = [];
  for (let i = 1; i <= 5; i++) {
    if (daysTracker[i].length === 0) freeDays.push(i as DayNumber);
  }

  // Remap back to standard ScheduleItem interfaces for the rest of the application
  const normalSched = sched.map((s) => ({
    course: s.course,
    group: s.group.group,
  }));

  return {
    schedule: normalSched,
    score,
    freeWeekdays,
    daysOnCampus,
    freeDays,
    totalGapTime,
    weeklyCommute: totalCommuteTime,
    gaps,
  };
}
