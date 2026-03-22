import type { Course, Group } from "@/lib/types";
import { normalizeDay, parseCourseTitleString } from "./utils";

export function parseMarkdownExport(text: string): Course[] {
  const lines = text.split("\n");

  let courseTitle = "";
  const titleLine = lines.find((l) => l.startsWith("**Course:**"));
  if (titleLine) {
    courseTitle = titleLine.replace("**Course:**", "").trim();
  }

  const { subjectCode, courseName } = parseCourseTitleString(courseTitle);

  const tableLines = lines.filter(
    (l) => l.startsWith("|") && !l.includes("---"),
  );
  if (tableLines.length < 2) return [];
  const dataRows = tableLines.slice(1);

  const groupMap = new Map<string, Group>();
  let currentGroup = "";
  let currentLecturer = "";

  for (const row of dataRows) {
    const cols = row
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");
    if (cols.length < 5) continue;
    const [groupName, lecturer, dayRaw, time, room] = cols;

    if (groupName) {
      currentGroup = groupName;
      currentLecturer = lecturer;
    }

    const day = normalizeDay(dayRaw ?? "");
    if (!currentGroup || !day) continue;

    if (!groupMap.has(currentGroup)) {
      groupMap.set(currentGroup, {
        name: currentGroup,
        lecturer: currentLecturer,
        times: [],
      });
    }
    const groupEntry = groupMap.get(currentGroup);
    if (groupEntry) {
      groupEntry.times.push({ day, time, room });
    }
  }

  const groups = Array.from(groupMap.values()).filter(
    (g) => g.times.length > 0,
  );
  if (groups.length === 0) return [];
  return [{ courseName, subjectCode, groups, isActive: true }];
}
