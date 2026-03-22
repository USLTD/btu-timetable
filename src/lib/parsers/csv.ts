import type { Course, Group } from "@/lib/types";
import { courseMapToArray, normalizeDay, parseCourseTitleString } from "./utils";

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseCsvExport(text: string): Course[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const courseMap = new Map<
    string,
    { subjectCode: string; courseName: string; groups: Map<string, Group> }
  >();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (cols.length < 6) continue;
    const [courseTitle, groupName, lecturer, dayRaw, time, room] = cols;
    const { subjectCode, courseName } = parseCourseTitleString(courseTitle);
    const day = normalizeDay(dayRaw ?? "");
    if (!day) continue;

    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, { subjectCode, courseName, groups: new Map() });
    }
    const course = courseMap.get(courseName);
    if (!course) continue;
    if (!course.groups.has(groupName)) {
      course.groups.set(groupName, { name: groupName, lecturer, times: [] });
    }
    const group = course.groups.get(groupName);
    if (group) {
      group.times.push({ day, time, room });
    }
  }

  return courseMapToArray(courseMap);
}
