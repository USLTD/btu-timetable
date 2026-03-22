import { localizedDayName } from "./constants";
import { formatDuration, formatTimeRange } from "./time";
import type { DayNumber, ScoredSchedule } from "./types";
import * as m from "@/paraglide/messages";
import { collectScoredScheduleEvents } from "./schedule-events";

export function generateSummaryReport(
  schedule: ScoredSchedule,
  locale: string,
  label: string,
) {
  const now = new Date();
  const byDay = collectScoredScheduleEvents(schedule);

  const freeDays =
    schedule.freeDays && schedule.freeDays.length > 0
      ? schedule.freeDays
          .map((d) => localizedDayName(d, locale, "short"))
          .join(", ")
      : schedule.freeList ?? m.none();

  const lines: string[] = [
    m.summary_report_title(),
    m.summary_report_option_line({ 0: label }),
    m.summary_report_score_line({ 0: schedule.score.toFixed(0) }),
    m.summary_report_days_on_campus_line({ 0: String(schedule.daysOnCampus) }),
    m.summary_report_free_days_line({ 0: freeDays }),
    m.summary_report_total_gaps_line({ 0: formatDuration(schedule.totalGapTime) }),
    m.summary_report_weekly_commute_line({
      0: formatDuration(Math.round(schedule.weeklyCommute * 60)),
    }),
    m.summary_report_generated_line({ 0: now.toLocaleString(locale) }),
    "",
    m.summary_report_schedule_label(),
  ];

  for (const day of [1, 2, 3, 4, 5, 6, 7] as DayNumber[]) {
    const events = byDay[day];
    lines.push(m.summary_report_day_header({ 0: localizedDayName(day, locale, "long") }));
    if (!events || events.length === 0) {
      lines.push(m.summary_report_none_item());
      continue;
    }
    for (const ev of events) {
      const courseLabel = ev.subjectCode
        ? `${ev.subjectCode} ${ev.course}`
        : ev.course;
      const timeLabel = formatTimeRange(ev.time, locale);
      const room = ev.room ? ` · ${ev.room}` : "";
      const lecturer = ev.lecturer ? ` — ${ev.lecturer}` : "";
      lines.push(`  - ${timeLabel} · ${courseLabel} (${ev.group})${room}${lecturer}`);
    }
  }

  return lines.join("\n");
}

export function exportSummaryReport(
  schedule: ScoredSchedule,
  locale: string,
  label: string,
) {
  const content = generateSummaryReport(schedule, locale, label);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "schedule-summary.txt";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

