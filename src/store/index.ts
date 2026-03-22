import { effect, signal } from "@preact/signals";
import type { Course, MinMax, DaySettings, LecturerPref, ScoredSchedule, RejectionReason } from "@/lib/types";
import { INITIAL_DAY_SETTINGS } from "@/lib/constants";
import { loadAppState, saveAppState, type AppStorageKey } from "@/lib/storage";

// --- Types ---

// --- Helper: Create Persisted Signal ---
function createPersistedSignal<T>(key: AppStorageKey, initialValue: T) {
  const getInitial = (): T => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = loadAppState<T>(key);
      if (item !== undefined) return item;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage`, e);
    }
    return initialValue;
  };

  const sig = signal<T>(getInitial());

  // Listen for changes and persist to localStorage
  effect(() => {
    if (typeof window !== "undefined") {
      try {
        saveAppState(key, sig.value);
      } catch (e) {
        console.error(`Error saving ${key} to localStorage`, e);
      }
    }
  });

  return sig;
}

// --- Global State Signals ---
export const globalCourses = createPersistedSignal<Course[]>("app-courses", []);
export const globalSchedules = createPersistedSignal<ScoredSchedule[]>("app-schedules", []);
export const globalRejections = createPersistedSignal<RejectionReason[]>("app-rejections", []);
export const globalDailyCommute = createPersistedSignal<MinMax>("app-commute", { min: 1.0, max: 2.5 });
export const globalClassesPerDay = createPersistedSignal<MinMax>("app-classes-per-day", { min: 1, max: 5 });
export const globalClassesPerDayEnabled = createPersistedSignal<boolean>("app-classes-per-day-enabled", false);
export const globalMaxOverlap = createPersistedSignal<number>("app-max-overlap", 0);
export const globalMaxOverlapEnabled = createPersistedSignal<boolean>("app-max-overlap-enabled", false);
export const globalMaxDaysOnCampus = createPersistedSignal<number | null>("app-max-days-on-campus", null);
export const globalTime = createPersistedSignal<MinMax>("app-global-time", { min: 480, max: 1260 });
export const globalDaySettings = createPersistedSignal<DaySettings>("app-day-settings", INITIAL_DAY_SETTINGS);
export const globalLecturerPrefs = createPersistedSignal<LecturerPref[]>("app-lecturer-prefs", []);
export const globalMinRating = createPersistedSignal<number>("app-min-rating", 0);
