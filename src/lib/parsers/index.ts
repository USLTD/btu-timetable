import type { Course } from "@/lib/types";
import type { ScheduleParser } from "./types";
import { parseCleanHtmlExport } from "./html";
import { parseJsonExport } from "./json";
import { parseCsvExport } from "./csv";
import { parseMarkdownExport } from "./markdown";

export { parseCleanHtmlExport } from "./html";
export { parseJsonExport } from "./json";
export { parseCsvExport } from "./csv";
export { parseMarkdownExport } from "./markdown";
export type { ExportJsonV2, LegacyJsonEntry, ScheduleParser } from "./types";

const PARSERS: ScheduleParser[] = [
  { extensions: ["json"], parse: parseJsonExport },
  { extensions: ["csv"], parse: parseCsvExport },
  { extensions: ["md"], parse: parseMarkdownExport },
  { extensions: ["html", "htm"], parse: parseCleanHtmlExport },
];

export async function parseFiles(
  files: FileList,
  existingCourses: Course[],
): Promise<Course[]> {
  const newCourses = [...existingCourses];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    const parser = PARSERS.find((item) => item.extensions.includes(ext));
    if (!parser) continue;

    const parsed = parser.parse(text);
    for (const course of parsed) {
      if (!newCourses.find((c) => c.courseName === course.courseName)) {
        newCourses.push(course);
      }
    }
  }

  return newCourses;
}
