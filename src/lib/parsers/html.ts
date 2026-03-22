import type { Course, Group } from "@/lib/types";
import { normalizeDay, parseCourseTitleString } from "./utils";

export function parseCleanHtmlExport(text: string): Course[] {
  const doc = new DOMParser().parseFromString(text, "text/html");
  if (!doc.querySelector("table caption") && !doc.querySelector("table thead")) {
    return [];
  }

  const results: Course[] = [];

  for (const table of doc.querySelectorAll("table")) {
    const caption = table.querySelector("caption")?.textContent?.trim() ?? "";
    const { subjectCode, courseName } = parseCourseTitleString(caption);

    const groupMap = new Map<string, Group>();
    let currentGroup = "";
    let currentLecturer = "";

    table.querySelectorAll("tbody tr").forEach((row) => {
      const tds = row.querySelectorAll("td");
      if (tds.length === 0) return;

      let colOffset = 0;
      if (tds.length >= 5) {
        currentGroup = tds[0].textContent?.trim() ?? "";
        currentLecturer = tds[1].textContent?.trim() ?? "";
        colOffset = 2;
      } else if (tds.length >= 3) {
        colOffset = 0;
      } else {
        return;
      }

      const dayRaw = tds[colOffset]?.textContent ?? "";
      const timeTxt = tds[colOffset + 1]?.textContent?.trim() ?? "";
      const roomTxt = tds[colOffset + 2]?.textContent?.trim() ?? "";

      const day = normalizeDay(dayRaw);
      if (!currentGroup || !day) return;

      if (!groupMap.has(currentGroup)) {
        groupMap.set(currentGroup, {
          name: currentGroup,
          lecturer: currentLecturer,
          times: [],
        });
      }
      const group = groupMap.get(currentGroup);
      if (group) {
        group.times.push({
          day,
          time: timeTxt,
          room: roomTxt,
        });
      }
    });

    const groups = Array.from(groupMap.values()).filter(
      (g) => g.times.length > 0,
    );
    if (groups.length > 0) {
      results.push({ courseName, subjectCode, groups, isActive: true });
    }
  }
  return results;
}
