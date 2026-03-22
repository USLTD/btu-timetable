import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { base64ToBytes, bytesToBase64 } from "@/lib/utils";
import { BackupEnvelopeSchema } from "@/lib/proto/backup_pb";
import { DEFAULT_DAY_SETTING, INITIAL_DAY_SETTINGS } from "@/lib/constants";
import type { ShareableState } from "./shareable-state";
import type {
  BusyPeriod,
  DayNumber,
  DayPref,
  DaySettings,
  LocalizedString,
  MinMax,
} from "./types";

const SCHEMA_VERSION = 1;
const JSON_SCHEMA_VERSION = 1;

const DEFAULT_DAY_SETTINGS: DaySettings = INITIAL_DAY_SETTINGS;
const DEFAULT_GLOBAL_TIME: MinMax = { min: 480, max: 1260 };
const DEFAULT_CLASSES_PER_DAY: MinMax = { min: 1, max: 5 };
const DEFAULT_DAILY_COMMUTE: MinMax = { min: 1.0, max: 2.5 };
const DEFAULT_MAX_OVERLAP = 5;

type BackupTime = {
  day?: DayNumber;
  time?: string;
  room?: string;
  room_localized?: LocalizedString;
  roomLocalized?: LocalizedString;
};

type BackupGroup = {
  name?: string;
  lecturer?: string;
  times?: BackupTime[];
  name_localized?: LocalizedString;
  lecturer_localized?: LocalizedString;
  nameLocalized?: LocalizedString;
  lecturerLocalized?: LocalizedString;
};

type BackupCourse = {
  course_name?: string;
  subject_code?: string;
  groups?: BackupGroup[];
  is_active?: boolean;
  locked_group?: string;
  excluded_groups?: string[];
  order?: number;
  course_name_localized?: LocalizedString;
  subject_code_localized?: LocalizedString;
  courseName?: string;
  subjectCode?: string;
  isActive?: boolean;
  lockedGroup?: string;
  excludedGroups?: string[];
  courseNameLocalized?: LocalizedString;
  subjectCodeLocalized?: LocalizedString;
};

type BackupDaySettingPayload = {
  pref?: DayPref;
  min?: number;
  max?: number;
  busy_periods?: BusyPeriod[];
  busyPeriods?: BusyPeriod[];
  commute?: number;
};

type BackupDaySettingEntry = BackupDaySettingPayload & {
  day?: DayNumber;
  setting?: BackupDaySettingPayload;
};

type BackupPayload = {
  courses?: BackupCourse[];
  day_settings?: BackupDaySettingEntry[];
  daySettings?: BackupDaySettingEntry[];
  global_time?: MinMax;
  globalTime?: MinMax;
  classes_per_day?: MinMax;
  classesPerDay?: MinMax;
  max_overlap?: number;
  maxOverlap?: number;
  daily_commute?: MinMax;
  dailyCommute?: MinMax;
  lecturer_prefs?: ShareableState["lecturerPrefs"];
  lecturerPrefs?: ShareableState["lecturerPrefs"];
};

type BackupEnvelopeDecoded = {
  schema_version?: number;
  schemaVersion?: number;
  payload?: BackupPayload;
};

function toDaySettingsEntries(daySettings: DaySettings) {
  return Object.entries(daySettings).map(([day, setting]) => ({
    day: Number(day),
    setting: {
      pref: setting.pref,
      min: setting.min,
      max: setting.max,
      busyPeriods: setting.busyPeriods ?? [],
      commute: setting.commute ?? undefined,
    },
  }));
}

function fromDaySettingsEntries(entries: BackupDaySettingEntry[]): DaySettings {
  const result: DaySettings = { ...DEFAULT_DAY_SETTINGS };
  for (const entry of entries) {
    const setting = entry.setting ?? entry;
    const day = entry.day;
    if (!day) continue;
    const base = result[day] ?? { pref: "enabled", ...DEFAULT_DAY_SETTING };
    result[day] = {
      pref: setting.pref ?? base.pref,
      min: setting.min ?? base.min,
      max: setting.max ?? base.max,
      busyPeriods: setting.busyPeriods ?? setting.busy_periods ?? base.busyPeriods ?? [],
      commute: setting.commute ?? base.commute ?? undefined,
    };
  }
  return result;
}

/** Strip empty/all-empty LocalizedString objects coming from protobuf defaults */
function emptyToUndefined(ls?: LocalizedString): LocalizedString | undefined {
  if (!ls) return undefined;
  if (!ls.en && !ls.ka) return undefined;
  return ls;
}

/**
 * Resolve a localized string for the given locale, falling back to the plain value.
 * Use this in UI components to display the correct language.
 */
export function resolveLocalized(
  localized: LocalizedString | undefined,
  fallback: string,
  locale: string,
): string {
  if (!localized) return fallback;
  const value = locale === "ka" ? localized.ka : localized.en;
  return value || fallback;
}

export function encodeBackup(state: ShareableState): string {
  const payload = {
    courses: state.courses.map((course) => ({
      courseName: course.courseName,
      subjectCode: course.subjectCode ?? "",
      groups: course.groups.map((group) => ({
        name: group.name,
        lecturer: group.lecturer,
        times: group.times.map((t) => ({
          day: t.day,
          time: t.time,
          room: t.room ?? "",
          roomLocalized: t.roomLocalized ?? undefined,
        })),
        nameLocalized: group.nameLocalized ?? undefined,
        lecturerLocalized: group.lecturerLocalized ?? undefined,
      })),
      isActive: course.isActive,
      lockedGroup: course.lockedGroup ?? "",
      excludedGroups: course.excludedGroups ?? [],
      order: course.order ?? 0,
      courseNameLocalized: course.courseNameLocalized ?? undefined,
      subjectCodeLocalized: course.subjectCodeLocalized ?? undefined,
    })),
    daySettings: toDaySettingsEntries(state.daySettings),
    globalTime: state.globalTime,
    classesPerDay: state.classesPerDay,
    maxOverlap: state.maxOverlap,
    dailyCommute: state.dailyCommute,
    lecturerPrefs: state.lecturerPrefs,
  };

  const message = create(BackupEnvelopeSchema, {
    schemaVersion: SCHEMA_VERSION,
    payload,
  } as any);
  const buffer = toBinary(BackupEnvelopeSchema, message);
  return bytesToBase64(buffer);
}

export function encodeBackupBytes(state: ShareableState): Uint8Array {
  const base64 = encodeBackup(state);
  return base64ToBytes(base64);
}

export function decodeBackup(encoded: string): ShareableState | null {
  try {
    const bytes = base64ToBytes(encoded);
    return decodeBackupBytes(bytes);
  } catch {
    return null;
  }
}

export function decodeBackupBytes(bytes: Uint8Array): ShareableState | null {
  try {
    const decoded = fromBinary(BackupEnvelopeSchema, bytes) as BackupEnvelopeDecoded;
    const schemaVersion = decoded.schemaVersion ?? decoded.schema_version;
    if (schemaVersion !== SCHEMA_VERSION) return null;
    const payload = decoded.payload ?? {};
    return normalizeShareableState({
      courses: (payload.courses ?? []).map((course) => ({
        courseName: course.courseName ?? course.course_name ?? "",
        subjectCode: course.subjectCode ?? course.subject_code ?? "",
        groups: (course.groups ?? []).map((group) => ({
          name: group.name ?? "",
          lecturer: group.lecturer ?? "",
          times: (group.times ?? []).map((t) => ({
            day: t.day ?? 1,
            time: t.time ?? "",
            room: t.room ?? "",
            roomLocalized: emptyToUndefined(t.roomLocalized ?? t.room_localized),
          })),
          nameLocalized: emptyToUndefined(group.nameLocalized ?? group.name_localized),
          lecturerLocalized: emptyToUndefined(group.lecturerLocalized ?? group.lecturer_localized),
        })),
        isActive: course.isActive ?? course.is_active ?? true,
        lockedGroup: course.lockedGroup ?? course.locked_group ?? undefined,
        excludedGroups: course.excludedGroups ?? course.excluded_groups ?? [],
        order: course.order ?? undefined,
        courseNameLocalized: emptyToUndefined(
          course.courseNameLocalized ?? course.course_name_localized,
        ),
        subjectCodeLocalized: emptyToUndefined(
          course.subjectCodeLocalized ?? course.subject_code_localized,
        ),
      })),
      daySettings: fromDaySettingsEntries(payload.daySettings ?? payload.day_settings ?? []),
      globalTime: payload.globalTime ?? payload.global_time,
      classesPerDay: payload.classesPerDay ?? payload.classes_per_day,
      maxOverlap: payload.maxOverlap ?? payload.max_overlap,
      dailyCommute: payload.dailyCommute ?? payload.daily_commute,
      lecturerPrefs: payload.lecturerPrefs ?? payload.lecturer_prefs ?? [],
    });
  } catch {
    return null;
  }
}

export function encodeBackupJson(state: ShareableState): string {
  return JSON.stringify({ schemaVersion: JSON_SCHEMA_VERSION, data: state });
}

export function decodeBackupJson(encoded: string): ShareableState | null {
  try {
    const parsed = JSON.parse(encoded) as
      | { schemaVersion?: number; data?: Partial<ShareableState> }
      | Partial<ShareableState>;
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      return normalizeShareableState(
        (parsed as { data?: Partial<ShareableState> }).data ?? {},
      );
    }
    return normalizeShareableState(parsed as Partial<ShareableState>);
  } catch {
    return null;
  }
}

export function decodeBackupJsonBytes(bytes: Uint8Array): ShareableState | null {
  try {
    const text = new TextDecoder().decode(bytes);
    return decodeBackupJson(text);
  } catch {
    return null;
  }
}

function normalizeShareableState(
  state: Partial<ShareableState>,
): ShareableState {
  return {
    courses: state.courses ?? [],
    daySettings: state.daySettings
      ? fromDaySettingsEntries(
          Object.entries(state.daySettings).map(([day, setting]) => ({
            day: Number(day) as DayNumber,
            setting,
          })),
        )
      : { ...DEFAULT_DAY_SETTINGS },
    globalTime: state.globalTime ?? DEFAULT_GLOBAL_TIME,
    classesPerDay: state.classesPerDay ?? DEFAULT_CLASSES_PER_DAY,
    maxOverlap: state.maxOverlap ?? DEFAULT_MAX_OVERLAP,
    dailyCommute: state.dailyCommute ?? DEFAULT_DAILY_COMMUTE,
    lecturerPrefs: state.lecturerPrefs ?? [],
  };
}
