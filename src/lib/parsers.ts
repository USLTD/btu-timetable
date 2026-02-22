import type { Course, Group, TimeSlot, ExportedGroupJSON } from '../types.ts';
import { DAY_MAP } from './constants.ts';

// --- Shared helpers ---

function parseCourseTitleString(raw: string): { subjectCode: string; courseName: string } {
  const cleaned = raw
    .replace(/\.html?$/i, '')
    .replace(/\s*\(\d+\)$/, '')
    .replace(/^-\s*/, '')
    .trim();
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    return { subjectCode: parts[0].trim(), courseName: parts.slice(1).join(' - ').trim() };
  }
  return { subjectCode: '', courseName: cleaned };
}

function courseMapToArray(
  courseMap: Map<string, { subjectCode: string; courseName: string; groups: Map<string, Group> }>
): Course[] {
  const results: Course[] = [];
  for (const c of courseMap.values()) {
    const groups = Array.from(c.groups.values()).filter(g => g.times.length > 0);
    if (groups.length > 0) {
      results.push({ courseName: c.courseName, subjectCode: c.subjectCode, groups, isActive: true });
    }
  }
  return results;
}

// --- RAW BTU Classroom HTML (original format with .group_title) ---

export function parseRawBTUHtml(doc: Document, fileName: string): Course | null {
  // Strip extension and browser duplicate suffixes like " (1)", " (2)"
  const rawName = fileName
    .replace(/\.html?$/i, '')
    .replace(/\s*\(\d+\)$/, '')
    .replace(/^-\s*/, '')
    .trim();
  let subjectCode = "";
  let courseName = rawName;

  if (rawName.includes(' - ')) {
    const parts = rawName.split(' - ');
    subjectCode = parts[0].trim();
    courseName = parts.slice(1).join(' - ').trim();
  }

  const groups: Group[] = [];
  const groupNodes = doc.querySelectorAll('.group_title');

  groupNodes.forEach(node => {
    const groupName = node.textContent?.trim() ?? '';
    let instructor = "Unknown";
    const instNode = node.parentElement?.querySelector('.glyphicon-user');
    if (instNode?.nextSibling?.textContent) {
      instructor = instNode.nextSibling.textContent.trim();
    }

    const tr = node.closest('tr');
    let scheduleTable = tr?.querySelector('.table-responsive table tbody') || tr?.querySelector('table tbody');

    if (!scheduleTable) {
      const nextTr = tr?.nextElementSibling;
      if (nextTr && !nextTr.querySelector('.group_title')) {
        scheduleTable = nextTr.querySelector('.table-responsive table tbody') || nextTr.querySelector('table tbody');
      }
    }

    const times: TimeSlot[] = [];
    if (scheduleTable) {
      scheduleTable.querySelectorAll('tr').forEach(tRow => {
        const tds = tRow.querySelectorAll('td');
        if (tds.length >= 3) {
          const dayTxt = tds[0].textContent?.replace(/\s+/g, '').trim() ?? '';
          const timeTxt = tds[1].textContent?.trim() ?? '';
          const roomTxt = tds[2].textContent?.trim() ?? '';
          if (DAY_MAP[dayTxt]) {
            times.push({ day: DAY_MAP[dayTxt], time: timeTxt, room: roomTxt });
          }
        }
      });
    }
    if (times.length > 0) {
      groups.push({ name: groupName, instructor, times });
    }
  });

  if (groups.length === 0) return null;
  return { courseName, subjectCode, groups, isActive: true };
}

// --- Clean HTML table export (schedule.html from userscript) ---

export function parseCleanHtmlExport(doc: Document): Course[] {
  const results: Course[] = [];

  for (const table of doc.querySelectorAll('table')) {
    const caption = table.querySelector('caption')?.textContent?.trim() ?? '';
    const { subjectCode, courseName } = parseCourseTitleString(caption);

    const groupMap = new Map<string, Group>();
    let currentGroup = '';
    let currentInstructor = '';

    table.querySelectorAll('tbody tr').forEach(row => {
      const tds = row.querySelectorAll('td');
      if (tds.length === 0) return;

      let colOffset = 0;
      if (tds.length >= 5) {
        currentGroup = tds[0].textContent?.trim() ?? '';
        currentInstructor = tds[1].textContent?.trim() ?? '';
        colOffset = 2;
      } else if (tds.length >= 3) {
        colOffset = 0;
      } else {
        return;
      }

      const dayTxt = tds[colOffset]?.textContent?.replace(/\s+/g, '').trim() ?? '';
      const timeTxt = tds[colOffset + 1]?.textContent?.trim() ?? '';
      const roomTxt = tds[colOffset + 2]?.textContent?.trim() ?? '';

      if (!currentGroup || !DAY_MAP[dayTxt]) return;

      if (!groupMap.has(currentGroup)) {
        groupMap.set(currentGroup, { name: currentGroup, instructor: currentInstructor, times: [] });
      }
      groupMap.get(currentGroup)!.times.push({ day: DAY_MAP[dayTxt], time: timeTxt, room: roomTxt });
    });

    const groups = Array.from(groupMap.values()).filter(g => g.times.length > 0);
    if (groups.length > 0) {
      results.push({ courseName, subjectCode, groups, isActive: true });
    }
  }
  return results;
}

// --- JSON export (schedule.json from userscript) ---

export function parseJsonExport(text: string): Course[] {
  let data: ExportedGroupJSON[];
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const courseMap = new Map<string, { subjectCode: string; courseName: string; groups: Map<string, Group> }>();

  for (const entry of data) {
    const { subjectCode, courseName } = parseCourseTitleString(entry.courseTitle);
    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, { subjectCode, courseName, groups: new Map() });
    }
    const course = courseMap.get(courseName)!;
    if (!course.groups.has(entry.groupName)) {
      course.groups.set(entry.groupName, { name: entry.groupName, instructor: entry.instructor, times: [] });
    }
    const group = course.groups.get(entry.groupName)!;
    for (const sched of entry.schedules) {
      const dayTxt = sched.day.replace(/\s+/g, '').trim();
      if (DAY_MAP[dayTxt]) {
        group.times.push({ day: DAY_MAP[dayTxt], time: sched.time, room: sched.room });
      }
    }
  }

  return courseMapToArray(courseMap);
}

// --- CSV export (schedule.csv from userscript) ---

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
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
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseCsvExport(text: string): Course[] {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const courseMap = new Map<string, { subjectCode: string; courseName: string; groups: Map<string, Group> }>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (cols.length < 6) continue;
    const [courseTitle, groupName, instructor, dayRaw, time, room] = cols;
    const { subjectCode, courseName } = parseCourseTitleString(courseTitle);
    const dayTxt = dayRaw.replace(/\s+/g, '').trim();
    if (!DAY_MAP[dayTxt]) continue;

    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, { subjectCode, courseName, groups: new Map() });
    }
    const course = courseMap.get(courseName)!;
    if (!course.groups.has(groupName)) {
      course.groups.set(groupName, { name: groupName, instructor, times: [] });
    }
    course.groups.get(groupName)!.times.push({ day: DAY_MAP[dayTxt], time, room });
  }

  return courseMapToArray(courseMap);
}

// --- Markdown export (schedule.md from userscript) ---

export function parseMarkdownExport(text: string): Course[] {
  const lines = text.split('\n');

  let courseTitle = '';
  const titleLine = lines.find(l => l.startsWith('**Course:**'));
  if (titleLine) {
    courseTitle = titleLine.replace('**Course:**', '').trim();
  }

  const { subjectCode, courseName } = parseCourseTitleString(courseTitle);

  const tableLines = lines.filter(l => l.startsWith('|') && !l.includes('---'));
  if (tableLines.length < 2) return [];
  const dataRows = tableLines.slice(1);

  const groupMap = new Map<string, Group>();
  let currentGroup = '';
  let currentInstructor = '';

  for (const row of dataRows) {
    const cols = row.split('|').map(c => c.trim()).filter(c => c !== '');
    if (cols.length < 5) continue;
    const [group, instructor, dayRaw, time, room] = cols;

    if (group) {
      currentGroup = group;
      currentInstructor = instructor;
    }

    const dayTxt = dayRaw.replace(/\s+/g, '').trim();
    if (!currentGroup || !DAY_MAP[dayTxt]) continue;

    if (!groupMap.has(currentGroup)) {
      groupMap.set(currentGroup, { name: currentGroup, instructor: currentInstructor, times: [] });
    }
    groupMap.get(currentGroup)!.times.push({ day: DAY_MAP[dayTxt], time, room });
  }

  const groups = Array.from(groupMap.values()).filter(g => g.times.length > 0);
  if (groups.length === 0) return [];
  return [{ courseName, subjectCode, groups, isActive: true }];
}

// --- Unified file handler ---

export async function parseFiles(files: FileList, existingCourses: Course[]): Promise<Course[]> {
  const newCourses = [...existingCourses];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    let parsed: Course[] = [];

    if (ext === 'json') {
      parsed = parseJsonExport(text);
    } else if (ext === 'csv') {
      parsed = parseCsvExport(text);
    } else if (ext === 'md') {
      parsed = parseMarkdownExport(text);
    } else if (ext === 'html' || ext === 'htm') {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      if (doc.querySelector('.group_title')) {
        const course = parseRawBTUHtml(doc, file.name);
        if (course) parsed = [course];
      } else if (doc.querySelector('table caption') || doc.querySelector('table thead')) {
        parsed = parseCleanHtmlExport(doc);
      }
    }

    for (const course of parsed) {
      if (!newCourses.find(c => c.courseName === course.courseName)) {
        newCourses.push(course);
      }
    }
  }

  return newCourses;
}

