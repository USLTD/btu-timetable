import { useEffect, useRef } from "preact/hooks";
import { useFeatureFlags } from "@/lib/feature-flags";
import { MOCK_STATE } from "@/lib/mock-data";
import {
  APP_STORAGE_KEYS,
  clearAppState,
  getAppStorageNamespace,
  loadAppState,
  loadState,
  removeState,
  saveState,
  setAppStorageNamespace,
} from "@/lib/storage";
import { INITIAL_DAY_SETTINGS } from "@/lib/constants";
import {
  globalClassesPerDay,
  globalCourses,
  globalDailyCommute,
  globalDaySettings,
  globalLecturerPrefs,
  globalMaxOverlap,
  globalMinRating,
  globalRejections,
  globalSchedules,
  globalTime,
} from "@/store";
import type { Course, DaySettings, LecturerPref, MinMax, RejectionReason, ScoredSchedule } from "@/lib/types";

const MOCK_ACTIVE_KEY = "app-mock-active";
const MOCK_SNAPSHOT_KEY = "app-mock-snapshot";

type MockSnapshot = {
  storedAt: number;
  state: {
    courses: Course[];
    schedules: ScoredSchedule[];
    rejections: RejectionReason[];
    dailyCommute: MinMax;
    classesPerDay: MinMax;
    maxOverlap: number;
    globalTime: MinMax;
    daySettings: DaySettings;
    lecturerPrefs: LecturerPref[];
    minRating: number;
  };
};

const DEFAULT_STATE: MockSnapshot["state"] = {
  courses: [],
  schedules: [],
  rejections: [],
  dailyCommute: { min: 1.0, max: 2.5 },
  classesPerDay: { min: 1, max: 5 },
  maxOverlap: 5,
  globalTime: { min: 480, max: 1260 },
  daySettings: INITIAL_DAY_SETTINGS,
  lecturerPrefs: [],
  minRating: 0,
};

function readSnapshot(): MockSnapshot | null {
  return loadState<MockSnapshot>(MOCK_SNAPSHOT_KEY) ?? null;
}

function writeSnapshot(snapshot: MockSnapshot) {
  saveState(MOCK_SNAPSHOT_KEY, snapshot);
}

function isMockActive(): boolean {
  return loadState<boolean>(MOCK_ACTIVE_KEY) ?? false;
}

function setMockActive(value: boolean) {
  if (value) {
    saveState(MOCK_ACTIVE_KEY, true);
  } else {
    removeState(MOCK_ACTIVE_KEY);
  }
}

function readStateFromNamespace(namespace: "real" | "mock") {
  return {
    courses: loadAppState<Course[]>("app-courses", namespace) ?? DEFAULT_STATE.courses,
    schedules: loadAppState<ScoredSchedule[]>("app-schedules", namespace) ?? DEFAULT_STATE.schedules,
    rejections: loadAppState<RejectionReason[]>("app-rejections", namespace) ?? DEFAULT_STATE.rejections,
    dailyCommute: loadAppState<MinMax>("app-commute", namespace) ?? DEFAULT_STATE.dailyCommute,
    classesPerDay: loadAppState<MinMax>("app-classes-per-day", namespace) ?? DEFAULT_STATE.classesPerDay,
    maxOverlap: loadAppState<number>("app-max-overlap", namespace) ?? DEFAULT_STATE.maxOverlap,
    globalTime: loadAppState<MinMax>("app-global-time", namespace) ?? DEFAULT_STATE.globalTime,
    daySettings: loadAppState<DaySettings>("app-day-settings", namespace) ?? DEFAULT_STATE.daySettings,
    lecturerPrefs: loadAppState<LecturerPref[]>("app-lecturer-prefs", namespace) ?? DEFAULT_STATE.lecturerPrefs,
    minRating: loadAppState<number>("app-min-rating", namespace) ?? DEFAULT_STATE.minRating,
  };
}

function applyState(state: MockSnapshot["state"]) {
  globalCourses.value = state.courses;
  globalSchedules.value = state.schedules;
  globalRejections.value = state.rejections;
  globalDailyCommute.value = state.dailyCommute;
  globalClassesPerDay.value = state.classesPerDay;
  globalMaxOverlap.value = state.maxOverlap;
  globalTime.value = state.globalTime;
  globalDaySettings.value = state.daySettings;
  globalLecturerPrefs.value = state.lecturerPrefs;
  globalMinRating.value = state.minRating;
}

function buildMockState(): MockSnapshot["state"] {
  return {
    courses: MOCK_STATE.courses,
    schedules: [],
    rejections: [],
    dailyCommute: MOCK_STATE.dailyCommute,
    classesPerDay: MOCK_STATE.classesPerDay,
    maxOverlap: MOCK_STATE.maxOverlap,
    globalTime: MOCK_STATE.globalTime,
    daySettings: MOCK_STATE.daySettings,
    lecturerPrefs: MOCK_STATE.lecturerPrefs,
    minRating: 0,
  };
}

function ensureSnapshot() {
  if (readSnapshot()) return;
  const realState = readStateFromNamespace("real");
  writeSnapshot({ storedAt: Date.now(), state: realState });
}

function enterMockMode(forceReseed: boolean) {
  const alreadyActive = isMockActive();
  ensureSnapshot();
  setMockActive(true);
  setAppStorageNamespace("mock");

  const shouldReseed = forceReseed || !alreadyActive;
  if (shouldReseed) {
    clearAppState(APP_STORAGE_KEYS, "mock");
    applyState(buildMockState());
  }
}

function exitMockMode() {
  setAppStorageNamespace("real");
  const snapshot = readSnapshot();
  if (snapshot) {
    applyState(snapshot.state);
  }
  clearAppState(APP_STORAGE_KEYS, "mock");
  setMockActive(false);
  removeState(MOCK_SNAPSHOT_KEY);
}

export function useMockData() {
  const { flags } = useFeatureFlags();
  const prevEnabled = useRef<boolean | null>(null);

  useEffect(() => {
    const enabled = flags["mock-data"];
    const prev = prevEnabled.current;
    prevEnabled.current = enabled;

    if (enabled) {
      const forceReseed = prev === false;
      enterMockMode(forceReseed);
      return;
    }

    if (prev) {
      exitMockMode();
      return;
    }

    if (getAppStorageNamespace() !== "real") {
      setAppStorageNamespace("real");
    }
  }, [flags["mock-data"]]);
}
