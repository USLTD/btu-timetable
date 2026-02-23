import type { ScheduleItem } from '../types.ts';
import { parseTime } from './time.ts';

const DAY_NAMES: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
  5: 'Friday', 6: 'Saturday', 7: 'Sunday',
};

interface FlatEvent {
  time: string;
  room: string;
  course: string;
  subjectCode: string;
  groupName: string;
  lecturer: string;
  startMin: number;
}

/**
 * Generate an HTML table of the schedule grouped by day.
 * Uses DOM APIs for clean, well-formed output.
 */
export function generateScheduleHTML(schedule: ScheduleItem[], title = 'My Schedule'): string {
  const byDay: Record<number, FlatEvent[]> = {};

  for (const item of schedule) {
    for (const t of item.group.times) {
      const parsed = parseTime(t.time);
      if (!parsed) continue;
      const day = t.day as number;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push({
        time: t.time,
        room: t.room || '',
        course: item.course.courseName,
        subjectCode: item.course.subjectCode || '',
        groupName: item.group.name,
        lecturer: item.group.lecturer,
        startMin: parsed.start,
      });
    }
  }

  // Sort events within each day
  for (const d of Object.keys(byDay)) {
    byDay[Number(d)].sort((a, b) => a.startMin - b.startMin);
  }

  const doc = document.implementation.createHTMLDocument(title);
  const fieldset = doc.createElement('fieldset');
  fieldset.style.cssText = 'margin:20px 0;border:1px solid #ddd;border-radius:8px;padding:15px;font-family:Arial,sans-serif;';

  const legend = doc.createElement('legend');
  legend.style.cssText = 'font-size:1.3em;font-weight:bold;padding:0 10px;';
  legend.textContent = title;
  fieldset.appendChild(legend);

  const table = doc.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;';
  const tbody = doc.createElement('tbody');

  const sortedDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  for (const dayNum of sortedDays) {
    const dayName = DAY_NAMES[dayNum] ?? `Day ${dayNum}`;
    const events = byDay[dayNum];

    // Day header row
    const dayRow = doc.createElement('tr');
    dayRow.style.cssText = 'background:#d9edf7;';
    const dayCell = doc.createElement('td');
    dayCell.colSpan = 6;
    const h4 = doc.createElement('h4');
    h4.style.margin = '0';
    h4.textContent = dayName;
    dayCell.appendChild(h4);
    dayRow.appendChild(dayCell);
    tbody.appendChild(dayRow);

    // Column header row
    const headerRow = doc.createElement('tr');
    headerRow.style.cssText = 'background:#f5f5f5;font-weight:bold;';
    for (const label of ['Time', 'Room', 'Course', 'Group', 'Lecturer', 'Code']) {
      const td = doc.createElement('td');
      td.style.cssText = 'padding:6px 8px;border-bottom:1px solid #ddd;';
      const b = doc.createElement('b');
      b.textContent = label;
      td.appendChild(b);
      headerRow.appendChild(td);
    }
    tbody.appendChild(headerRow);

    // Event rows
    for (const ev of events) {
      const tr = doc.createElement('tr');
      for (const val of [ev.time, ev.room, ev.course, ev.groupName, ev.lecturer, ev.subjectCode]) {
        const td = doc.createElement('td');
        td.style.cssText = 'padding:6px 8px;border-bottom:1px solid #eee;';
        td.textContent = val;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  table.appendChild(tbody);
  fieldset.appendChild(table);

  return fieldset.outerHTML;
}

/** Download a string as an HTML file. */
export function downloadHTML(content: string, filename = 'schedule.html'): void {
  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${filename.replace('.html', '')}</title>
<style>body{font-family:Arial,sans-serif;margin:20px;}</style>
</head><body>${content}</body></html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Open a printable PDF view using the schedule HTML. */
export function exportToPrintablePDF(schedule: ScheduleItem[], optionNum: number): void {
  const html = generateScheduleHTML(schedule, `BTU Schedule — Option ${optionNum}`);

  const printWin = window.open('', '_blank');
  if (!printWin) return;
  printWin.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
  <title>BTU Schedule — Option ${optionNum}</title>
  <style>
    @media print {
      @page { margin: 1.5cm; size: A4 portrait; }
      body { font-family: Arial, sans-serif; color: #222; }
      fieldset { border: 2px solid #ddd; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #999; padding: 8px; text-align: left; }
      tr[style*="d9edf7"] { background: #d9edf7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h4 { margin: 0; }
    }
    body { font-family: Arial, sans-serif; margin: 20px; }
    legend { font-size: 1.4em; font-weight: bold; padding: 0 15px; }
  </style>
</head><body>${html}</body></html>`);
  printWin.document.close();
  setTimeout(() => printWin.print(), 300);
}
