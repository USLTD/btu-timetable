import { useState, useCallback, useRef, useEffect, useMemo } from "preact/hooks";
import {
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Bell,
  FileText,
  Info,
  GitCompareArrows,
} from "lucide-preact";
import { useLocale } from "@/lib/i18n";
import { useFeatureFlags } from "@/lib/feature-flags";
import * as m from "@/paraglide/messages";
import type {
  BusyPeriod,
  Course,
  DayNumber,
  DaySettings,
  LecturerPref,
  MinMax,
  RejectionReason,
  ScoredSchedule,
} from "@/lib/types";
import { localizedDayName } from "../lib/constants";
import type { ImageFormat } from "../lib/image-export";
import { formatDuration, formatDurationLong, parseTime } from "../lib/time";
import { useToast } from "./toast";
import { MetricsDashboard } from "./schedule-parts/metrics-dashboard";
import { CompareOverlay } from "./schedule-parts/compare-overlay";
import { ScheduleCard } from "./schedule-parts/schedule-card";
import { cx } from "@/lib/cx";

interface ScheduleResultsProps {
  schedules: ScoredSchedule[];
  daySettings: DaySettings;
  dailyCommute: MinMax;
  classesPerDay: MinMax;
  maxOverlap: number;
  maxResults: number;
  lecturerPrefs?: LecturerPref[];
  hasSearched: boolean;
  loading: boolean;
  limitWarning: boolean;
  rejections: RejectionReason[];
  courses: Course[];

  onTogglePin: (idx: number) => void;
  onRenameSchedule: (idx: number, label: string) => void;
  onLockGroup?: (courseIdx: number, groupName: string | undefined) => void;
  onAddBusyPeriod?: (dayNum: DayNumber, bp: BusyPeriod) => void;
  onRemoveBusyPeriod?: (dayNum: DayNumber, bpIdx: number) => void;
}

function collectIntervals(schedule: ScoredSchedule, day: DayNumber) {
  const intervals: { start: number; end: number }[] = [];
  for (const item of schedule.schedule) {
    for (const t of item.group.times) {
      if (t.day !== day) continue;
      const parsed = parseTime(t.time);
      if (parsed) intervals.push(parsed);
    }
  }
  return intervals;
}

function computeOverlapMinutes(a: ScoredSchedule, b: ScoredSchedule) {
  const overlapByDay: Record<DayNumber, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
  };
  const days: DayNumber[] = [1, 2, 3, 4, 5, 6, 7];
  for (const day of days) {
    const aIntervals = collectIntervals(a, day);
    const bIntervals = collectIntervals(b, day);
    let overlap = 0;
    for (const ai of aIntervals) {
      for (const bi of bIntervals) {
        const start = Math.max(ai.start, bi.start);
        const end = Math.min(ai.end, bi.end);
        if (end > start) overlap += end - start;
      }
    }
    overlapByDay[day] = overlap;
  }
  return overlapByDay;
}

export function ScheduleResults({ schedules, daySettings, dailyCommute, classesPerDay, maxOverlap, maxResults, lecturerPrefs, hasSearched, loading, limitWarning, rejections, courses, onTogglePin, onRenameSchedule, onLockGroup, onAddBusyPeriod, onRemoveBusyPeriod }: ScheduleResultsProps) {
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);
  const [inlineCompare, setInlineCompare] = useState<{
    a: ScoredSchedule;
    b: ScoredSchedule;
  } | null>(null);
  const [similarResults, setSimilarResults] = useState<Record<number, ScoredSchedule[]>>({});
  const [showRejections, setShowRejections] = useState(false);
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const locale = useLocale();
  const { flags } = useFeatureFlags();
  const [openExportMenu, setOpenExportMenu] = useState<number | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [collapsedCards, setCollapsedCards] = useState<Set<number>>(new Set());

  const toggleCollapse = useCallback((idx: number) => {
    setCollapsedCards(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  // Accordion state for schedule results section
  const [resultsExpanded, setResultsExpanded] = useState(true);

  // Bulk export pinned (#3)
  const handleBulkExport = useCallback(async () => {
    const pinned = schedules.filter(s => s.pinned);
    if (pinned.length === 0) { toast(m.no_pinned_schedules_to_export(), 'info'); return; }
    const { generateICS, downloadICS } = await import("../lib/ics-export");
    // Merge all pinned into one ICS
    const allItems = pinned.flatMap(s => s.schedule);
    const ics = generateICS(allItems, reminderMinutes);
    downloadICS(ics, `pinned-schedules.ics`);
    toast(m.exported_pinned_count({ 0: pinned.length }));
  }, [schedules, reminderMinutes, toast]);

  // Close export menu on outside click
  useEffect(() => {
    if (openExportMenu === null) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setOpenExportMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openExportMenu]);

  useEffect(() => {
    if (editingLabel !== null) {
      labelInputRef.current?.focus();
      labelInputRef.current?.select();
    }
  }, [editingLabel]);

  const handleExportICS = async (res: ScoredSchedule, idx: number) => {
    const { generateICS, downloadICS } = await import("../lib/ics-export");
    const ics = generateICS(res.schedule, reminderMinutes);
    downloadICS(ics, `schedule-option-${idx + 1}.ics`);
    setOpenExportMenu(null);
    toast(m.ics_exported_option({ 0: idx + 1 }));
  };

  const handleExportHTML = async (res: ScoredSchedule, idx: number) => {
    const { generateScheduleHTML, downloadHTML } = await import("../lib/html-export");
    const title = m.schedule_option_title({ 0: idx + 1 });
    const html = generateScheduleHTML(res.schedule, title);
    downloadHTML(html, `schedule-option-${idx + 1}.html`, title);
    setOpenExportMenu(null);
    toast(m.html_exported_option({ 0: idx + 1 }));
  };

  const handleExportPDF = async (res: ScoredSchedule, idx: number) => {
    const { exportToPrintablePDF } = await import("../lib/html-export");
    exportToPrintablePDF(res.schedule, idx + 1);
    setOpenExportMenu(null);
    toast(m.pdf_opened_in_new_window());
  };

  const handleExportImage = async (res: ScoredSchedule, idx: number, format: ImageFormat) => {
    try {
      const { exportAsImage } = await import("../lib/image-export");
      await exportAsImage(res.schedule, idx + 1, format);
      toast(m.exported_format_option({ 0: format.toUpperCase(), 1: idx + 1 }));
    } catch {
      toast(m.image_export_failed(), 'error');
    }
    setOpenExportMenu(null);
  };

  // Stats dashboard (#2)
  const stats = useMemo(() => {
    if (schedules.length === 0) return null;
    const scores = schedules.map(s => s.score);
    const freeDaysCounts = schedules.map(s => s.freeWeekdays);
    const gapTimes = schedules.map(s => s.totalGapTime);
    return {
      count: schedules.length,
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      avgFreeDays: (freeDaysCounts.reduce((a, b) => a + b, 0) / freeDaysCounts.length).toFixed(1),
      maxFreeDays: Math.max(...freeDaysCounts),
      minGap: Math.min(...gapTimes),
      avgGap: Math.round(gapTimes.reduce((a, b) => a + b, 0) / gapTimes.length),
      pinned: schedules.filter(s => s.pinned).length,
    };
  }, [schedules]);

  const handleTrySimilar = useCallback(async (idx: number, res: ScoredSchedule) => {
    if (similarResults[idx]) {
      // Toggle off
      setSimilarResults(prev => { const next = { ...prev }; delete next[idx]; return next; });
      return;
    }
    const options = {
      daySettings,
      classesPerDay,
      maxOverlap,
      dailyCommute,
      maxResults,
      lecturerPrefs,
    };
    const { trySimilar } = await import("../lib/scheduler");
    const similar = trySimilar(res, courses, options);
    setSimilarResults(prev => ({ ...prev, [idx]: similar }));
  }, [
    classesPerDay,
    courses,
    dailyCommute,
    daySettings,
    lecturerPrefs,
    maxOverlap,
    maxResults,
    similarResults,
  ]);

  const toggleCompare = useCallback((idx: number) => {
    if (compareA === idx) { setCompareA(null); return; }
    if (compareB === idx) { setCompareB(null); return; }
    if (compareA === null) { setCompareA(idx); return; }
    if (compareB === null) { setCompareB(idx); return; }
    // Both set: replace B
    setCompareB(idx);
  }, [compareA, compareB]);

  // Feature 4: pinned first, then by score
  const sorted = useMemo(() => {
    const next = [...schedules];
    next.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    return next;
  }, [schedules]);

  const isComparing = compareA !== null && compareB !== null || inlineCompare !== null;
  const compareData = useMemo(() => {
    if (!isComparing) return null;
    if (inlineCompare) {
      return { aIndex: -1, bIndex: -1, a: inlineCompare.a, b: inlineCompare.b };
    }
    if (compareA === null || compareB === null) return null;
    const a = sorted[compareA];
    const b = sorted[compareB];
    if (!a || !b) return null;
    return { aIndex: compareA, bIndex: compareB, a, b };
  }, [compareA, compareB, inlineCompare, isComparing, sorted]);

  const overlapHeatmap = useMemo(() => {
    if (!compareData) return null;
    return computeOverlapMinutes(compareData.a, compareData.b);
  }, [compareData]);

  const maxOverlapMinutes = useMemo(() => {
    if (!overlapHeatmap) return 0;
    return Math.max(...Object.values(overlapHeatmap));
  }, [overlapHeatmap]);

  const diffSummary = useMemo(() => {
    if (!compareData) return [];
    const { a, b } = compareData;
    const metrics = [
      {
        key: "score",
        label: m.score(),
        a: a.score,
        b: b.score,
        better: "higher",
        format: (value: number) => value.toFixed(0),
      },
      {
        key: "freeDays",
        label: m.free_days(),
        a: a.freeWeekdays,
        b: b.freeWeekdays,
        better: "higher",
        format: (value: number) => String(value),
      },
      {
        key: "campusDays",
        label: m.campus_days(),
        a: a.daysOnCampus,
        b: b.daysOnCampus,
        better: "lower",
        format: (value: number) => String(value),
      },
      {
        key: "gaps",
        label: m.gaps_label(),
        a: a.totalGapTime,
        b: b.totalGapTime,
        better: "lower",
        format: (value: number) => formatDuration(value),
      },
      {
        key: "commute",
        label: m.commute_label(),
        a: Math.round(a.weeklyCommute * 60),
        b: Math.round(b.weeklyCommute * 60),
        better: "lower",
        format: (value: number) => formatDuration(value),
      },
    ] as const;

    return metrics.map((metric) => {
      const delta = metric.b - metric.a;
      let winner: "A" | "B" | "tie" = "tie";
      if (delta !== 0) {
        if (metric.better === "higher") {
          winner = delta > 0 ? "B" : "A";
        } else {
          winner = delta < 0 ? "B" : "A";
        }
      }
      const value = metric.format(Math.abs(delta));
      return {
        key: metric.key,
        label: metric.label,
        winner,
        value,
      };
    });
  }, [compareData]);

  /** Summarize rejections into a readable list */
  const rejectionSummary = (): string[] => {
    const msgs: string[] = [];
    const counts: Record<string, number> = {};
    for (const r of rejections) {
      let key = '';
      switch (r.type) {
        case 'day_disabled': key = m.rejection_disabled_day({ 0: r.course, 1: r.group, 2: localizedDayName(r.day, locale, 'long') }); break;
        case 'outside_hours': key = m.rejection_outside_hours({ 0: r.course, 1: r.group, 2: localizedDayName(r.day, locale, 'long') }); break;
        case 'busy_period': key = m.rejection_busy_period_overlap({ 0: r.course, 1: r.group, 2: localizedDayName(r.day, locale, 'long') }); break;
        case 'too_many_classes': key = m.rejection_exceeds_max_classes({ 0: r.course, 1: r.group, 2: localizedDayName(r.day, locale, 'long') }); break;
        case 'overlap': key = m.rejection_course_overlap({ 0: r.course, 1: r.group, 2: r.conflictCourse, 3: r.conflictGroup }); break;
        case 'min_classes': key = m.rejection_min_classes_day({ 0: localizedDayName(r.day, locale, 'long') }); break;
      }
      counts[key] = (counts[key] || 0) + 1;
    }
    for (const [msg, count] of Object.entries(counts)) {
      msgs.push(count > 1 ? `${msg} (×${count})` : msg);
    }
    return msgs.slice(0, 12); // cap to avoid flood
  };

  return (
    <>
      {/* Screen reader announcements for schedule changes */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        class="sr-only"
      >
        {hasSearched && !loading && schedules.length > 0 && 
          m.generated_schedules_count({ 0: schedules.length })
        }
        {hasSearched && !loading && schedules.length === 0 && 
          m.no_valid_schedules_found()
        }
        {loading && m.generating_schedules()}
        {hasSearched && !loading && rejections.length > 0 &&
          m.rejections_found_count({ 0: rejections.length })
        }
        {hasSearched && !loading && schedules.filter(s => s.pinned).length > 0 &&
          m.pinned_schedules_count({ 0: schedules.filter(s => s.pinned).length })
        }
      </div>

      {/* Rejection explanations */}
      {hasSearched && !loading && rejections.length > 0 && (
        <div class={styles.rejectionCard}>
          <button type="button" onClick={() => setShowRejections(!showRejections)}
            class={styles.rejectionToggle} aria-expanded={showRejections} aria-controls="rejection-list">
            <div class={styles.rejectionToggleText}>
              <Info class={styles.iconSm} />
              <span class={styles.rejectionTitle}>{m.why_were_some_combinations_rejected()} ({rejections.length})</span>
            </div>
            {showRejections ? <ChevronUp class={styles.rejectionChevron} /> : <ChevronDown class={styles.rejectionChevron} />}
          </button>
          {showRejections && (
            <ul id="rejection-list" class={styles.rejectionList}>
              {rejectionSummary().map((msg) => (
                <li key={msg} class={styles.rejectionItem}>
                  <span class={styles.rejectionBullet}>•</span>
                  <span>{msg}</span>
                </li>
              ))}
              {rejections.length > 12 && <li class={styles.rejectionMore}>…{m.and_more({ 0: rejections.length - 12 })}</li>}
            </ul>
          )}
        </div>
      )}

      {limitWarning && (
        <div class={styles.limitCard}>
          <AlertCircle class={styles.iconMd} />
          <div>
            <p class={styles.limitTitle}>{m.too_many_permutations()}</p>
          <p class={styles.limitText}>{m.results_limit_notice()}</p>
          </div>
        </div>
      )}

      {hasSearched && !loading && schedules.length === 0 && (
        <div class={styles.emptyCard}>
          <AlertCircle class={styles.emptyIcon} />
          <h3 class={styles.emptyTitle}>{m.no_valid_schedules_found()}</h3>
          <p class={styles.emptyText}>{m.results_no_valid_combinations_hint()}</p>
        </div>
      )}

      {/* Comparison view */}
      {compareData && (
        <CompareOverlay
          compareData={compareData}
          diffSummary={diffSummary}
          overlapHeatmap={overlapHeatmap}
          maxOverlapMinutes={maxOverlapMinutes}
          daySettings={daySettings}
          dailyCommute={dailyCommute}
          courses={courses}
          onClose={() => {
            setCompareA(null);
            setCompareB(null);
            setInlineCompare(null);
          }}
          onAddBusyPeriod={onAddBusyPeriod}
          onRemoveBusyPeriod={onRemoveBusyPeriod}
          onLockGroup={onLockGroup}
        />
      )}

      {sorted.length > 0 && (
        <div class={styles.resultsSection}>
            <div class={styles.resultsHeader}>
            <h2 class={styles.resultsTitle}>{m.top_suggested_schedules()}</h2>
            {/* ICS reminder */}
            <div class={styles.resultsActions}>
              <div class={styles.reminderRow}>
                <Bell class={styles.iconXsMuted} />
                <select value={reminderMinutes} onChange={e => setReminderMinutes(Number((e.currentTarget as HTMLSelectElement).value))}
                  class={styles.reminderSelect}
                  aria-label={m.ics_reminder()}>
                  <option value={0}>{m.no_reminder()}</option>
                  <option value={5}>{formatDurationLong(5)}</option>
                  <option value={10}>{formatDurationLong(10)}</option>
                  <option value={15}>{formatDurationLong(15)}</option>
                  <option value={30}>{formatDurationLong(30)}</option>
                  <option value={60}>{formatDurationLong(60)}</option>
                </select>
              </div>
              {stats && stats.pinned > 0 && (
                <button type="button" onClick={handleBulkExport}
                  class={styles.bulkExportButton} aria-label={`Export ${stats.pinned} pinned schedules as ICS`}>
                  <Download class={styles.iconXs} /> {m.export_pinned_count({ 0: stats.pinned })}
                </button>
              )}
              {flags["summary-report-export"] && sorted.length > 0 && (
                <button type="button"
                  onClick={async () => {
                    const top = sorted[0];
                    const { exportSummaryReport } = await import("../lib/report-export");
                    exportSummaryReport(top, locale, top.label ?? m.option_number({ 0: 1 }));
                    toast(m.summary_report_exported());
                  }}
                  class={styles.summaryExportButton}
                  aria-label="Export summary report of top schedule"
                >
                  <FileText class={styles.iconXs} /> {m.export_summary()}
                </button>
              )}
            </div>
          </div>          {/* Stats dashboard (#2) */}
          <MetricsDashboard schedules={schedules} />

          {/* Keyboard shortcuts hint */}
          <div class={cx(styles.shortcutRow, "no-print")}>
            <span class={styles.shortcutKey}>G</span><span>{m.generate()}</span>
            <span class={styles.shortcutKey}>D</span><span>{m.theme()}</span>
            <span class={styles.shortcutKey}>←→</span><span>{m.navigate()}</span>
            <span class={styles.shortcutKey}>P</span><span>{m.pin()}</span>
            <span class={styles.shortcutKey}>Ctrl+Z/Y</span><span>{m.undo_redo()}</span>
          </div>

          {/* Accordion toggle for schedule cards */}
          <button type="button"
            onClick={() => setResultsExpanded(!resultsExpanded)}
            class={cx(styles.accordionButton, "no-print")}
            aria-expanded={resultsExpanded}
            aria-controls="schedule-cards"
          >
            <span class={styles.accordionLabel}>{resultsExpanded ? m.hide_schedules() : m.show_schedules_count({ 0: sorted.length })}</span>
            {resultsExpanded ? <ChevronUp class={styles.iconSm} /> : <ChevronDown class={styles.iconSm} />}
          </button>

          {resultsExpanded && (
            <div id="schedule-cards">
              {sorted.map((res, idx) => {
                const originalIdx = schedules.indexOf(res);
                const compareActive = compareA === originalIdx || compareB === originalIdx;
                const similarActive = !!similarResults[originalIdx];
                return (
                  <ScheduleCard
                    key={originalIdx}
                    idx={idx}
                    originalIdx={originalIdx}
                    res={res}
                    schedules={schedules}
                    daySettings={daySettings}
                    dailyCommute={dailyCommute}
                    courses={courses}
                    compareActive={compareActive}
                    similarActive={similarActive}
                    collapsed={collapsedCards.has(originalIdx)}
                    editingLabel={editingLabel}
                    labelInputRef={labelInputRef}
                    openExportMenu={openExportMenu}
                    exportMenuRef={exportMenuRef}
                    similarResults={similarResults[originalIdx] || []}
                    flags={flags}
                    onRenameSchedule={onRenameSchedule}
                    setEditingLabel={setEditingLabel}
                    onTogglePin={onTogglePin}
                    setOpenExportMenu={setOpenExportMenu}
                    handleExportICS={handleExportICS}
                    handleExportHTML={handleExportHTML}
                    handleExportPDF={handleExportPDF}
                    handleExportImage={handleExportImage}
                    toggleCompare={toggleCompare}
                    handleTrySimilar={handleTrySimilar}
                    toggleCollapse={toggleCollapse}
                    onAddBusyPeriod={onAddBusyPeriod}
                    onRemoveBusyPeriod={onRemoveBusyPeriod}
                    onLockGroup={onLockGroup}
                    setInlineCompare={setInlineCompare}
                    setCompareA={setCompareA}
                    setCompareB={setCompareB}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {flags["diff-fab"] && compareData && (
        <button
          type="button"
          onClick={() => {
            document
              .getElementById("schedule-compare-overlay")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          class={styles.diffFab}
          aria-label={m.compare_schedules()}
        >
          <GitCompareArrows class={styles.iconMd} />
        </button>
      )}
    </>
  );
}

const styles = {
  iconXs: "w-3.5 h-3.5",
  iconXsMuted: "w-3.5 h-3.5 text-gray-500",
  iconSm: "w-4 h-4",
  iconMd: "w-5 h-5 shrink-0",
  rejectionCard:
    "mb-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm overflow-hidden dark:bg-purple-900/20 dark:border-purple-700",
  rejectionToggle:
    "w-full py-3 px-4 flex items-center justify-between transition-colors cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30",
  rejectionToggleText: "flex items-center gap-2 text-purple-800 dark:text-purple-200",
  rejectionTitle: "text-sm font-semibold",
  rejectionChevron: "w-4 h-4 text-purple-500",
  rejectionList:
    "pt-2 pb-3 px-4 border-t border-purple-200 text-sm text-purple-700 space-y-1 dark:border-purple-700 dark:text-purple-300",
  rejectionItem: "flex items-start gap-2",
  rejectionBullet: "text-purple-400 mt-0.5",
  rejectionMore: "text-purple-400 italic",
  limitCard:
    "mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 flex items-start gap-3 shadow-sm dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200",
  limitTitle: "font-semibold",
  limitText: "text-sm",
  emptyCard:
    "bg-orange-50 border border-orange-200 rounded-xl p-8 text-center shadow-sm dark:bg-orange-900/30 dark:border-orange-700",
  emptyIcon: "w-12 h-12 text-orange-400 mx-auto mb-3",
  emptyTitle: "text-xl font-bold text-orange-800 mb-2 dark:text-orange-200",
  emptyText: "text-orange-700 dark:text-orange-300",
  compareCard:
    "mb-6 bg-white rounded-xl shadow-sm p-4 border border-indigo-200 dark:bg-gray-800 dark:border-indigo-700",
  compareHeader: "flex items-center justify-between mb-4",
  compareTitle: "text-lg font-bold text-indigo-700 flex items-center gap-2 dark:text-indigo-300",
  compareClose: "text-sm text-gray-600 transition-colors cursor-pointer hover:text-red-500",
  compareGrid: "grid grid-cols-3 gap-2 text-sm mb-4",
  compareHeaderSpacer: "",
  compareHeaderCell: "font-semibold text-center",
  compareHeaderA: "text-blue-600 dark:text-blue-400",
  compareHeaderB: "text-green-600 dark:text-green-400",
  compareLabel: "text-gray-700 py-1 dark:text-gray-300",
  compareValue: "text-center py-1 dark:text-gray-200",
  compareValueSpan: "col-span-2 col-start-2",
  compareValueAmber: "text-amber-600 dark:text-amber-400",
  diffSummaryCard:
    "mb-4 border border-indigo-100 rounded-lg p-3 bg-indigo-50/30 dark:border-indigo-700/60 dark:bg-indigo-900/10",
  diffSummaryTitle: "text-xs font-semibold text-indigo-700 mb-2 dark:text-indigo-300",
  diffSummaryList: "flex flex-wrap gap-2",
  diffChip: "flex items-center gap-2 px-2.5 py-1 rounded-full border border-transparent text-xs",
  diffChipA:
    "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
  diffChipB:
    "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-900/30 dark:border-green-700",
  diffChipTie:
    "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700",
  diffChipLabel: "font-medium",
  diffChipValue: "font-semibold",
  heatmapCard:
    "mb-4 border border-indigo-100 rounded-lg p-3 bg-indigo-50/40 dark:border-indigo-700/60 dark:bg-indigo-900/20",
  heatmapTitle: "text-xs font-semibold text-indigo-700 mb-2 dark:text-indigo-300",
  heatmapGrid: "grid grid-cols-7 gap-2",
  heatmapCell: "flex flex-col items-center gap-1",
  heatmapBox:
    "w-full h-10 rounded-md border border-indigo-100 flex items-center justify-center text-xs font-semibold text-white dark:border-indigo-700/60",
  heatmapLabel: "text-xs text-gray-600 dark:text-gray-300",
  compareCalendars: "grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4",
  compareCalendarLabel: "text-sm font-semibold mb-2",
  compareCalendarLabelA: "text-blue-600 dark:text-blue-400",
  compareCalendarLabelB: "text-green-600 dark:text-green-400",
  resultsSection: "space-y-8",
  resultsHeader: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
  resultsTitle: "text-xl font-bold text-gray-800 dark:text-gray-100",
  resultsActions: "flex flex-wrap items-center gap-2 text-sm w-full",
  reminderRow: "flex flex-wrap items-center gap-1",
  reminderSelect:
    "text-xs border border-gray-200 rounded-md pl-1 pr-8 py-1 leading-normal min-h-[28px] bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 w-full sm:w-auto",
  bulkExportButton:
    "text-xs px-2.5 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 inline-flex items-center gap-1 transition-colors cursor-pointer hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700 dark:hover:bg-yellow-900/30",
  summaryExportButton:
    "text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1 transition-colors cursor-pointer hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700 dark:hover:bg-indigo-900/30",
  statsGrid: "grid grid-cols-2 gap-3 sm:grid-cols-4",
  statCard: "rounded-lg px-3 py-2 border border-gray-200",
  statCardBlue: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700",
  statCardGreen: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700",
  statCardAmber: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700",
  statCardPurple: "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700",
  statLabel: "text-xs font-medium",
  statLabelBlue: "text-blue-600 dark:text-blue-400",
  statLabelGreen: "text-green-600 dark:text-green-400",
  statLabelAmber: "text-amber-600 dark:text-amber-400",
  statLabelPurple: "text-purple-600 dark:text-purple-400",
  statValue: "text-lg font-bold",
  statValueBlue: "text-blue-800 dark:text-blue-200",
  statValueGreen: "text-green-800 dark:text-green-200",
  statValueAmber: "text-amber-800 dark:text-amber-200",
  statValuePurple: "text-purple-800 dark:text-purple-200",
  statPinned: "text-xs font-normal text-yellow-500 ml-1",
  statSubtle: "text-xs font-normal text-gray-500",
  shortcutRow: "flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-400",
  shortcutKey: "px-1.5 py-0.5 bg-gray-100 rounded-md font-mono dark:bg-gray-700",
  accordionButton:
    "w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 transition-colors cursor-pointer hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700",
  accordionLabel: "font-medium",
  scheduleCard: "bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 dark:bg-gray-800",
  scheduleCardDefault: "border border-gray-100 dark:border-gray-700",
  scheduleCardPinned:
    "border border-yellow-400 ring-2 ring-yellow-200 dark:border-yellow-600 dark:ring-yellow-800",
  scheduleHeader: "flex flex-wrap items-center justify-between gap-2 mb-4 sm:gap-3",
  scheduleHeaderLeft: "flex items-center gap-1.5 sm:gap-2",
  scheduleIndex:
    "bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm sm:w-8 sm:h-8 sm:text-sm",
  labelInput:
    "text-lg font-bold text-gray-800 bg-transparent border-0 border-b-2 border-blue-400 outline-none px-1 w-40 dark:text-gray-100",
  labelTitle: "text-lg font-bold text-gray-800 dark:text-gray-100",
  labelButton: "inline-flex items-center gap-1 text-left cursor-pointer group",
  labelIcon: "w-3.5 h-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600",
  pinButton: "p-2 rounded-md transition-colors cursor-pointer",
  pinButtonActive: "text-yellow-500",
  pinButtonInactive: "text-gray-300 hover:text-yellow-400 dark:text-gray-600",
  starFilled: "fill-current",
  exportMenuWrap: "relative",
  exportMenuButtons: "flex items-center",
  exportMenuButton:
    "p-2 text-gray-400 transition-colors cursor-pointer hover:text-blue-500 dark:text-gray-400",
  exportMenuButtonLeft: "border-r border-gray-200 rounded-l-md dark:border-gray-600",
  exportMenuButtonRight: "rounded-r-md",
  exportMenu:
    "absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] py-1 dark:bg-gray-800 dark:border-gray-600",
  exportMenuItem:
    "w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors cursor-pointer hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
  exportMenuDivider: "border-t border-gray-200 my-1 dark:border-gray-600",
  iconToggle: "p-2 rounded-md transition-colors cursor-pointer",
  iconToggleInactive: "text-gray-300 dark:text-gray-600",
  iconToggleIndigo: "hover:text-indigo-400",
  iconToggleActiveIndigo: "text-indigo-500",
  iconToggleTeal: "hover:text-teal-400",
  iconToggleActiveTeal: "text-teal-500",
  metricsRow: "flex flex-wrap gap-1.5 sm:gap-2",
  metricCard:
    "flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-200 text-xs sm:px-3 sm:py-1.5 sm:text-sm",
  metricCardGray: "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600",
  metricCardRed: "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700",
  metricCardAmber: "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700",
  metricCardGreen: "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700",
  metricCardOrange: "bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-700",
  metricIcon: "w-3.5 h-3.5 sm:w-4 sm:h-4",
  metricIconBlue: "text-blue-500",
  metricIconRed: "text-red-500",
  metricIconAmber: "text-amber-500",
  metricIconGreen: "text-green-600",
  metricIconOrange: "text-orange-500",
  metricText: "font-medium text-gray-700 dark:text-gray-200",
  metricValueBlue: "text-blue-700 dark:text-blue-400",
  metricValueRed: "text-red-700 dark:text-red-400",
  metricValueAmber: "text-amber-700 dark:text-amber-400",
  metricValueGreen: "text-green-700 dark:text-green-400",
  metricValueOrange: "text-orange-600 dark:text-orange-400",
  hideOnMobile: "hidden sm:inline",
  showOnMobile: "inline sm:hidden",
  collapseButton:
    "w-full flex items-center justify-center gap-1 py-1.5 text-xs text-gray-400 transition-colors cursor-pointer hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300",
  similarSection: "mt-4 border-t border-gray-200 pt-4 dark:border-gray-700",
  similarTitle:
    "text-sm font-semibold text-teal-700 mb-3 flex items-center gap-2 dark:text-teal-400",
  similarCount: "text-xs text-gray-400",
  similarEmpty: "text-sm text-gray-500 dark:text-gray-400",
  similarList: "space-y-3",
  similarCard: "bg-gray-50 rounded-lg p-3 text-sm dark:bg-gray-700/50",
  similarCardHeader: "flex items-center justify-between mb-1",
  similarCardTitle: "font-medium text-gray-700 dark:text-gray-200",
  similarDiffOld: "text-red-500 line-through",
  similarDiffNew: "text-green-600 dark:text-green-400",
  similarScore: "text-xs text-gray-400",
  similarCompareButton: "p-1.5 rounded-md transition-colors text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-teal-600 dark:hover:text-teal-400",
  similarMeta: "flex gap-3 text-xs text-gray-500 dark:text-gray-400",
  overlayDiffCard:
    "mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50",
  overlayDiffTitle: "text-sm font-semibold text-gray-700 mb-3 dark:text-gray-200",
  overlayDiffList: "space-y-1",
  overlayDiffRow:
    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-mono",
  overlayDiffShared:
    "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  overlayDiffRemoved:
    "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  overlayDiffAdded:
    "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  overlayDiffBadge:
    "inline-flex items-center justify-center w-8 text-[10px] font-bold rounded px-1 py-0.5 bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300",
  diffFab:
    "fixed bottom-24 right-6 z-40 p-3 sm:p-4 rounded-full bg-teal-600 text-white shadow-xl transition-all hover:scale-105 cursor-pointer dark:bg-teal-500",
};

