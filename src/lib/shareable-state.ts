import type { Course, DaySettings, LecturerPref, MinMax } from "./types";

/** The subset of app state that is shareable via URL or backups */
export interface ShareableState {
  courses: Course[];
  daySettings: DaySettings;
  globalTime: MinMax;
  classesPerDay: MinMax;
  maxOverlap: number;
  dailyCommute: MinMax;
  lecturerPrefs: LecturerPref[];
}

/** localStorage key → ShareableState field mapping */
export const SHAREABLE_KEY_MAP: { key: string; field: keyof ShareableState }[] =
  [
    { key: "app-courses", field: "courses" },
    { key: "app-day-settings", field: "daySettings" },
    { key: "app-global-time", field: "globalTime" },
    { key: "app-classes-per-day", field: "classesPerDay" },
    { key: "app-max-overlap", field: "maxOverlap" },
    { key: "app-commute", field: "dailyCommute" },
    { key: "app-lecturer-prefs", field: "lecturerPrefs" },
  ];
