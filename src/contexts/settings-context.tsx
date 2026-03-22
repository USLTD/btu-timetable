import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { 
  globalDailyCommute, 
  globalClassesPerDay,
  globalClassesPerDayEnabled,
  globalMaxOverlap,
  globalMaxOverlapEnabled,
  globalMaxDaysOnCampus,
  globalTime,
  globalDaySettings, 
  globalLecturerPrefs,
  globalMinRating 
} from "@/store";
import type { MinMax, DaySettings, DayNumber, DaySetting, LecturerPref } from "@/lib/types";

interface SettingsContextType {
  dailyCommute: MinMax;
  classesPerDay: MinMax;
  classesPerDayEnabled: boolean;
  maxOverlap: number;
  maxOverlapEnabled: boolean;
  maxDaysOnCampus: number | null;
  globalTime: MinMax;
  daySettings: DaySettings;
  lecturerPrefs: LecturerPref[];
  minRating: number;
  
  setDailyCommute: (value: MinMax) => void;
  setClassesPerDay: (value: MinMax) => void;
  setClassesPerDayEnabled: (value: boolean) => void;
  setMaxOverlap: (value: number) => void;
  setMaxOverlapEnabled: (value: boolean) => void;
  setMaxDaysOnCampus: (value: number | null) => void;
  setGlobalTime: (value: MinMax) => void;
  setDaySettings: (value: DaySettings | ((prev: DaySettings) => DaySettings)) => void;
  setLecturerPrefs: (value: LecturerPref[]) => void;
  setMinRating: (value: number) => void;
  
  toggleDayPref: (dayNum: DayNumber) => void;
  updateGlobalTime: (min: number, max: number) => void;
  updateDayTime: (dayNum: DayNumber, min: number, max: number) => void;
  updateDaySetting: (dayNum: DayNumber, patch: Partial<DaySetting>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: preact.ComponentChildren }) {
  const setDailyCommute = (value: MinMax) => {
    globalDailyCommute.value = value;
  };

  const setClassesPerDay = (value: MinMax) => {
    globalClassesPerDay.value = value;
  };

  const setClassesPerDayEnabled = (value: boolean) => {
    globalClassesPerDayEnabled.value = value;
  };

  const setMaxOverlap = (value: number) => {
    globalMaxOverlap.value = value;
  };

  const setMaxOverlapEnabled = (value: boolean) => {
    globalMaxOverlapEnabled.value = value;
  };

  const setMaxDaysOnCampus = (value: number | null) => {
    globalMaxDaysOnCampus.value = value;
  };

  const setGlobalTime = (value: MinMax) => {
    globalTime.value = value;
  };

  const setDaySettings = (value: DaySettings | ((prev: DaySettings) => DaySettings)) => {
    globalDaySettings.value =
      typeof value === "function" ? value(globalDaySettings.value) : value;
  };

  const setLecturerPrefs = (value: LecturerPref[]) => {
    globalLecturerPrefs.value = value;
  };

  const setMinRating = (value: number) => {
    globalMinRating.value = value;
  };

  const toggleDayPref = (dayNum: DayNumber) => {
    const current = globalDaySettings.value[dayNum].pref;
    const states: ("enabled" | "prioritize" | "disabled")[] = ["enabled", "prioritize", "disabled"];
    const next = states[(states.indexOf(current) + 1) % 3];
    
    globalDaySettings.value = {
      ...globalDaySettings.value,
      [dayNum]: { ...globalDaySettings.value[dayNum], pref: next }
    };
  };

  const updateGlobalTime = (min: number, max: number) => {
    globalTime.value = { min, max };
    
    const next = { ...globalDaySettings.value };
    for (let i = 1; i <= 7; i++) {
      next[i as DayNumber] = { ...next[i as DayNumber], min, max };
    }
    globalDaySettings.value = next;
  };

  const updateDayTime = (dayNum: DayNumber, min: number, max: number) => {
    globalDaySettings.value = {
      ...globalDaySettings.value,
      [dayNum]: { ...globalDaySettings.value[dayNum], min, max }
    };
  };

  const updateDaySetting = (dayNum: DayNumber, patch: Partial<DaySetting>) => {
    globalDaySettings.value = {
      ...globalDaySettings.value,
      [dayNum]: { ...globalDaySettings.value[dayNum], ...patch }
    };
  };

  return (
    <SettingsContext.Provider value={{
      dailyCommute: globalDailyCommute.value,
      classesPerDay: globalClassesPerDay.value,
      classesPerDayEnabled: globalClassesPerDayEnabled.value,
      maxOverlap: globalMaxOverlap.value,
      maxOverlapEnabled: globalMaxOverlapEnabled.value,
      maxDaysOnCampus: globalMaxDaysOnCampus.value,
      globalTime: globalTime.value,
      daySettings: globalDaySettings.value,
      lecturerPrefs: globalLecturerPrefs.value,
      minRating: globalMinRating.value,
      
      setDailyCommute,
      setClassesPerDay,
      setClassesPerDayEnabled,
      setMaxOverlap,
      setMaxOverlapEnabled,
      setMaxDaysOnCampus,
      setGlobalTime,
      setDaySettings,
      setLecturerPrefs,
      setMinRating,
      
      toggleDayPref,
      updateGlobalTime,
      updateDayTime,
      updateDaySetting,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
