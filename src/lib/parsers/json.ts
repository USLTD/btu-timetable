import type { Course, Group } from "@/lib/types";
import type { ExportJsonV2, LegacyJsonEntry } from "./types";
import { buildLocalizedString, courseMapToArray, normalizeDay, parseCourseTitleString, pickLocaleString } from "./utils";
import type { Locale } from "@/types/i18n";

function parseLegacyJson(entries: LegacyJsonEntry[]): Course[] {
  const courseMap = new Map<
    string,
    { subjectCode: string; courseName: string; groups: Map<string, Group> }
  >();

  for (const entry of entries) {
    const { subjectCode, courseName } = parseCourseTitleString(
      entry.courseTitle ?? "",
    );
    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, { subjectCode, courseName, groups: new Map() });
    }
    const course = courseMap.get(courseName);
    if (!course) continue;
    const lecturer = entry.lecturer ?? entry.instructor ?? "";
    if (!course.groups.has(entry.groupName)) {
      course.groups.set(entry.groupName, {
        name: entry.groupName,
        lecturer,
        times: [],
      });
    }
    const group = course.groups.get(entry.groupName);
    if (!group) continue;
    for (const sched of entry.schedules ?? []) {
      const day = normalizeDay(String(sched.day ?? ""));
      if (!day) continue;
      group.times.push({
        day,
        time: sched.time ?? "",
        room: sched.room ?? "",
      });
    }
  }

  return courseMapToArray(courseMap);
}

function parseJsonV2(payload: ExportJsonV2): Course[] {
  const subject = payload.subject ?? {};
  const nameMap: Partial<Record<Locale, string>> = {};
  const codeMap: Partial<Record<Locale, string>> = {};
  for (const [locale, value] of Object.entries(subject) as [Locale, any][]) {
    if (!value) continue;
    if (value.name) nameMap[locale] = String(value.name);
    if (value.code) codeMap[locale] = String(value.code);
  }

  const courseNameLocalized = buildLocalizedString(nameMap);
  const subjectCodeLocalized = buildLocalizedString(codeMap);
  const courseName = pickLocaleString(nameMap);
  const subjectCode = pickLocaleString(codeMap);

  const groups: Group[] = (payload.data ?? [])
    .map((entry: ExportJsonV2["data"][number]) => {
      const groupName = pickLocaleString(entry.group ?? {});
      const lecturer = pickLocaleString(entry.lecturer ?? {});
      const nameLocalized = buildLocalizedString(entry.group ?? {});
      const lecturerLocalized = buildLocalizedString(entry.lecturer ?? {});
      const times =
        entry.hours?.map((hour: ExportJsonV2["data"][number]["hours"][number]) => ({
          day: hour.day,
          time: `${hour.start}-${hour.end}`,
          room: hour.room ?? "",
        })) ?? [];
      return {
        name: groupName,
        lecturer,
        times,
        nameLocalized,
        lecturerLocalized,
      };
    })
    .filter((group: Group) => group.times.length > 0);

  if (!courseName && groups.length === 0) return [];

  return [
    {
      courseName,
      subjectCode,
      groups,
      isActive: true,
      courseNameLocalized,
      subjectCodeLocalized,
    },
  ];
}

export function parseJsonExport(text: string): Course[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  if (Array.isArray(data)) {
    return parseLegacyJson(data as LegacyJsonEntry[]);
  }

  if (data && typeof data === "object") {
    const payload = data as ExportJsonV2 & { data?: unknown };
    const schemaVersion = payload.meta?.schemaVersion ?? null;
    if (schemaVersion === 2) {
      return parseJsonV2(payload);
    }
    if (Array.isArray(payload.data)) {
      return parseLegacyJson(payload.data as LegacyJsonEntry[]);
    }
  }

  return [];
}
