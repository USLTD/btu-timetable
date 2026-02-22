import type { ScheduleItem, DayNumber } from '../types.ts';
import { parseTime } from './time.ts';

const ICAL_DAYS: Record<DayNumber, string> = { 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA', 7: 'SU' };

function pad(n: number): string { return n.toString().padStart(2, '0'); }

function toICalDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function toICalDateTime(d: Date, h: number, m: number): string {
  return `${toICalDate(d)}T${pad(h)}${pad(m)}00`;
}

/** Get the first occurrence date of a given DayNumber on or after `start`. */
function firstOccurrence(start: Date, dayNum: DayNumber): Date {
  const jsDay = dayNum % 7; // DayNumber 7 (Sunday) → JS 0
  const d = new Date(start);
  const diff = (jsDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function generateICS(schedule: ScheduleItem[], semesterStart: Date, semesterWeeks: number, reminderMinutes?: number): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EasyBTU//Schedule//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const item of schedule) {
    for (const t of item.group.times) {
      const parsed = parseTime(t.time);
      if (!parsed) continue;

      const startH = Math.floor(parsed.start / 60);
      const startM = parsed.start % 60;
      const endH = Math.floor(parsed.end / 60);
      const endM = parsed.end % 60;

      const firstDate = firstOccurrence(semesterStart, t.day);
      const dtStart = toICalDateTime(firstDate, startH, startM);
      const dtEnd = toICalDateTime(firstDate, endH, endM);
      const byDay = ICAL_DAYS[t.day];

      lines.push(
        'BEGIN:VEVENT',
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `RRULE:FREQ=WEEKLY;COUNT=${semesterWeeks};BYDAY=${byDay}`,
        `SUMMARY:${item.course.subjectCode ? item.course.subjectCode + ' ' : ''}${item.course.courseName}`,
        `LOCATION:${t.room}`,
        `DESCRIPTION:${item.group.name} — ${item.group.instructor}`,
        `UID:${crypto.randomUUID()}`,
      );

      // Add alarm/reminder if requested
      if (reminderMinutes != null && reminderMinutes > 0) {
        lines.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${item.course.courseName} in ${reminderMinutes} min`,
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

