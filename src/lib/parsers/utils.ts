import { DAY_MAP, normalizeDayKey } from "@/lib/constants";
import type { Course, DayNumber, Group, LocalizedString } from "@/lib/types";
import type { Locale } from "@/types/i18n";
import { isDefined } from "ts-extras";

export function parseCourseTitleString(raw: string): {
  subjectCode: string;
  courseName: string;
} {
  const cleaned = raw
    .replace(/\.html?$/i, "")
    .replace(/\s*\(\d+\)$/, "")
    .replace(/^-\s*/, "")
    .trim();
  if (cleaned.includes(" - ")) {
    const parts = cleaned.split(" - ");
    return {
      subjectCode: parts[0].trim(),
      courseName: parts.slice(1).join(" - ").trim(),
    };
  }
  return { subjectCode: "", courseName: cleaned };
}

export function courseMapToArray(
  courseMap: Map<
    string,
    { subjectCode: string; courseName: string; groups: Map<string, Group> }
  >,
): Course[] {
  const results: Course[] = [];
  for (const c of courseMap.values()) {
    const groups = Array.from(c.groups.values()).filter(
      (g) => g.times.length > 0,
    );
    if (groups.length > 0) {
      results.push({
        courseName: c.courseName,
        subjectCode: c.subjectCode,
        groups,
        isActive: true,
      });
    }
  }
  return results;
}

export function normalizeDay(raw: string): DayNumber | null {
  const key = normalizeDayKey(raw);
  return DAY_MAP[key] ?? null;
}

export function buildLocalizedString(
  values: Partial<Record<Locale, string>>,
): LocalizedString | undefined {
  const entries = (Object.entries(values) as [Locale, string | undefined][])
    .map(([key, value]) => [key, value?.trim() || undefined] as const)
    .filter(([, value]) => isDefined(value));
  if (entries.length === 0) return undefined;
  const result: LocalizedString = {};
  for (const [key, value] of entries) {
    if (key === "en" || key === "ka") {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function pickLocaleString(
  values: Partial<Record<Locale, string>>,
): string {
  const en = values.en?.trim();
  if (en) return en;
  const ka = values.ka?.trim();
  if (ka) return ka;
  const first = Object.values(values).find((value) => value?.trim());
  return first?.trim() ?? "";
}
