import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { globalSchedules, globalRejections } from "@/store";
import type { ScoredSchedule, RejectionReason } from "@/lib/types";

interface ScheduleContextType {
  schedules: ScoredSchedule[];
  rejections: RejectionReason[];
  setSchedules: (schedules: ScoredSchedule[] | ((prev: ScoredSchedule[]) => ScoredSchedule[])) => void;
  setRejections: (rejections: RejectionReason[] | ((prev: RejectionReason[]) => RejectionReason[])) => void;
  clearSchedules: () => void;
  addSchedule: (schedule: ScoredSchedule) => void;
  removeSchedule: (index: number) => void;
  updateSchedule: (index: number, schedule: ScoredSchedule) => void;
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export function ScheduleProvider({ children }: { children: preact.ComponentChildren }) {
  const setSchedules = (schedules: ScoredSchedule[] | ((prev: ScoredSchedule[]) => ScoredSchedule[])) => {
    globalSchedules.value = typeof schedules === "function" ? schedules(globalSchedules.value) : schedules;
  };

  const setRejections = (rejections: RejectionReason[] | ((prev: RejectionReason[]) => RejectionReason[])) => {
    globalRejections.value = typeof rejections === "function" ? rejections(globalRejections.value) : rejections;
  };

  const clearSchedules = () => {
    globalSchedules.value = [];
    globalRejections.value = [];
  };

  const addSchedule = (schedule: ScoredSchedule) => {
    globalSchedules.value = [...globalSchedules.value, schedule];
  };

  const removeSchedule = (index: number) => {
    globalSchedules.value = globalSchedules.value.filter((_, i) => i !== index);
  };

  const updateSchedule = (index: number, schedule: ScoredSchedule) => {
    globalSchedules.value = globalSchedules.value.map((s, i) => i === index ? schedule : s);
  };

  return (
    <ScheduleContext.Provider value={{
      schedules: globalSchedules.value,
      rejections: globalRejections.value,
      setSchedules,
      setRejections,
      clearSchedules,
      addSchedule,
      removeSchedule,
      updateSchedule,
    }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
}
