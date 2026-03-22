import type { Course, DayNumber } from "@/lib/types";
import type { Locale } from "@/types/i18n";
import type { Simplify } from "type-fest";

export type Time = `${number}:${number}`;
export type TimeRange = string;

export type LocaleStringMap = Partial<Record<Locale, string>>;
export type LocaleSubjectMap = Partial<Record<Locale, { code?: string; name: string }>>;

export type JsonV2Hour = {
  day: DayNumber;
  start: Time;
  end: Time;
  room: string;
};

export type ExportJsonV2 = Simplify<{
  meta?: { schemaVersion?: 2 | null };
  subject: LocaleSubjectMap;
  data: Array<{
    group: LocaleStringMap;
    lecturer: LocaleStringMap;
    hours: JsonV2Hour[];
  }>;
}>;

export interface LegacyJsonEntry {
  courseTitle: string;
  groupName: string;
  lecturer?: string;
  instructor?: string;
  schedules: { day: string; time: TimeRange; room: string }[];
}

export interface ScheduleParser {
  extensions: string[];
  parse: (text: string) => Course[];
}
