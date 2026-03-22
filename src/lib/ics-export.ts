import type { ScheduleItem, DayNumber } from '../types.ts';
import { parseTime } from './time.ts';

function pad(n: number): string { return n.toString().padStart(2, '0'); }

function toICalDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function toICalDateTime(d: Date, h: number, m: number): string {
  return `${toICalDate(d)}T${pad(h)}${pad(m)}00`;
}

/** Format a Date as UTC timestamp for DTSTAMP: YYYYMMDDTHHmmssZ */
function toICalUTC(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escape special characters for iCalendar text values. */
function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Generate a UUID, with fallback for non-secure contexts. */
function generateUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}

/** Get the first occurrence date of a given DayNumber on or after `start`. */
function firstOccurrence(start: Date, dayNum: DayNumber): Date {
  const jsDay = dayNum % 7; // DayNumber 7 (Sunday) → JS 0
  const d = new Date(start);
  const diff = (jsDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Default semester length in weeks */
const SEMESTER_WEEKS = 15;

const BUILDING_A_ADDRESS = '82 Ilia Chavchavadze Avenue, Tbilisi 0179';
const BUILDING_B_ADDRESS = 'N 82 Ilia Chavchavadze Avenue, Tbilisi 0162';

/** Determine the full location string from a room code. */
function roomToLocation(room: string): string {
  if (!room) return '';
  const trimmed = room.trim();
  if (trimmed.toUpperCase().startsWith('B')) {
    return `${trimmed}, ${BUILDING_B_ADDRESS}`;
  }
  return `${trimmed}, ${BUILDING_A_ADDRESS}`;
}

export function generateICS(schedule: ScheduleItem[], reminderMinutes?: number): string {
  // Use next Monday as the reference week
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = ((1 - day) + 7) % 7 || 7; // days until next Mon
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + diff);
  nextMonday.setHours(0, 0, 0, 0);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EasyBTU//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const item of schedule) {
    for (const t of item.group.times) {
      const parsed = parseTime(t.time);
      if (!parsed) continue;

      const startH = Math.floor(parsed.start / 60);
      const startM = parsed.start % 60;
      const endH = Math.floor(parsed.end / 60);
      const endM = parsed.end % 60;

      const firstDate = firstOccurrence(nextMonday, t.day);
      const dtStart = toICalDateTime(firstDate, startH, startM);
      const dtEnd = toICalDateTime(firstDate, endH, endM);

      const summary = escapeICalText(
        (item.course.subjectCode ? item.course.subjectCode + ' ' : '') + item.course.courseName
      );
      const location = escapeICalText(roomToLocation(t.room || ''));
      const description = escapeICalText(`${item.group.name} — ${item.group.lecturer}`);
      const dtstamp = toICalUTC(now);

      lines.push(
        'BEGIN:VEVENT',
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `RRULE:FREQ=WEEKLY;COUNT=${SEMESTER_WEEKS}`,
        `SUMMARY:${summary}`,
        `LOCATION:${location}`,
        `DESCRIPTION:${description}`,
        `UID:${generateUID()}@easybtu`,
      );

      // Add alarm/reminder if requested
      if (reminderMinutes != null && reminderMinutes > 0) {
        lines.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeICalText(item.course.courseName)} in ${reminderMinutes} min`,
          `TRIGGER:-PT${reminderMinutes}M`,
          'END:VALARM',
        );
      }

      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(content: string, filename = 'schedule.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Small delay to ensure download starts before cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

