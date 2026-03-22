export type DayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type DayPref = "enabled" | "prioritize" | "disabled";

/** Optional locale-specific overlay for user-visible strings. */
export interface LocalizedString {
  en?: string;
  ka?: string;
}

export interface TimeSlot {
  day: DayNumber;
  time: string;
  room: string;
  roomLocalized?: LocalizedString;
}

export interface Group {
  name: string;
  lecturer: string;
  times: TimeSlot[];
  nameLocalized?: LocalizedString;
  lecturerLocalized?: LocalizedString;
}

export interface Course {
  courseName: string;
  subjectCode: string;
  groups: Group[];
  isActive: boolean;
  lockedGroup?: string;
  excludedGroups?: string[];
  order?: number;
  courseNameLocalized?: LocalizedString;
  subjectCodeLocalized?: LocalizedString;
}

export interface ParsedTime {
  start: number;
  end: number;
}

export interface ScheduleItem {
  course: Course;
  group: Group;
}

export interface BusyPeriod {
  start: number; // minutes from midnight
  end: number; // minutes from midnight
}

export interface DaySetting {
  pref: DayPref;
  min: number;
  max: number;
  busyPeriods?: BusyPeriod[];
  /** Day-specific round-trip commute in hours. Overrides the global commute for this day. */
  commute?: number;
}

export type DaySettings = Record<DayNumber, DaySetting>;

export interface MinMax {
  min: number;
  max: number;
}

export interface GapSegment {
  day: DayNumber;
  start: number;
  end: number;
}

export type LecturerWeight = "prefer" | "neutral" | "avoid";

export interface LecturerPref {
  lecturer: string;
  weight: LecturerWeight;
}

export interface ScoredSchedule {
  schedule: ScheduleItem[];
  score: number;
  freeWeekdays: number;
  daysOnCampus: number;
  /** Day numbers that are free (ISO: 1=Mon … 5=Fri) */
  freeDays: DayNumber[];
  /** @deprecated kept for backward compat with persisted data */
  freeList?: string;
  totalGapTime: number;
  weeklyCommute: number;
  gaps: GapSegment[];
  pinned?: boolean;
  label?: string;
}

/** Reasons a schedule combination was rejected */
export type RejectionReason =
  | { type: "day_disabled"; day: DayNumber; course: string; group: string }
  | { type: "outside_hours"; day: DayNumber; course: string; group: string }
  | { type: "busy_period"; day: DayNumber; course: string; group: string }
  | { type: "too_many_classes"; day: DayNumber; course: string; group: string }
  | {
      type: "overlap";
      course: string;
      group: string;
      conflictCourse: string;
      conflictGroup: string;
    }
  | { type: "min_classes"; day: DayNumber }
  | { type: "low_rating"; course: string; group: string };

export interface SchedulerResult {
  schedules: ScoredSchedule[];
  limitReached: boolean;
  rejections: RejectionReason[];
}

export type DataAttribute = `data-${string}`;
