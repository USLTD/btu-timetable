import { Fragment } from "preact";
import { GitCompareArrows } from "lucide-preact";
import { cx } from "@/lib/cx";
import * as m from "@/paraglide/messages";
import { localizedDayName } from "@/lib/constants";
import { formatDuration } from "@/lib/time";
import { useLocale } from "@/lib/i18n";
import { useFeatureFlags } from "@/lib/feature-flags";
import { CalendarView } from "@/components/calendar-view";
import type { Course, DayNumber, DaySettings, MinMax, ScoredSchedule } from "@/lib/types";

interface CompareData {
  aIndex: number;
  bIndex: number;
  a: ScoredSchedule;
  b: ScoredSchedule;
}

interface DiffSummaryItem {
  key: string;
  label: string;
  winner: "A" | "B" | "tie";
  value: string;
}

interface CompareOverlayProps {
  compareData: CompareData;
  diffSummary: DiffSummaryItem[];
  overlapHeatmap: Record<DayNumber, number> | null;
  maxOverlapMinutes: number;
  daySettings: DaySettings;
  dailyCommute: MinMax;
  courses: Course[];
  onClose: () => void;
  // Passing through calendar actions
  onAddBusyPeriod?: any;
  onRemoveBusyPeriod?: any;
  onLockGroup?: any;
}

export function CompareOverlay({
  compareData,
  diffSummary,
  overlapHeatmap,
  maxOverlapMinutes,
  daySettings,
  dailyCommute,
  courses,
  onClose,
  onAddBusyPeriod,
  onRemoveBusyPeriod,
  onLockGroup,
}: CompareOverlayProps) {
  const locale = useLocale();
  const { flags } = useFeatureFlags();

  return (
    <div class={styles.compareCard} id="schedule-compare-overlay">
      <div class={styles.compareHeader}>
        <h3 class={styles.compareTitle}>
          <GitCompareArrows class={styles.iconMd} />
          {m.schedule_comparison()}
        </h3>
        <button type="button" onClick={onClose} class={styles.compareClose} aria-label="Close comparison">
          {m.close()}
        </button>
      </div>

      <div class={styles.compareGridWrap}>
        <div class={styles.compareGrid}>
          <div class={styles.compareHeaderSpacer}></div>
          <div class={cx(styles.compareHeaderCell, styles.compareHeaderA)}>
            {m.compare_label_a()} (#{compareData.aIndex + 1})
          </div>
          <div class={cx(styles.compareHeaderCell, styles.compareHeaderB)}>
            {m.compare_label_b()} (#{compareData.bIndex + 1})
          </div>
          {(
            [
              [m.campus_days(), "daysOnCampus"],
              [m.free_days(), "freeWeekdays"],
              [m.gaps_label(), "totalGapTime"],
              [m.commute_label(), "weeklyCommute"],
              [m.score(), "score"],
            ] as const
          ).map(([label, key]) => {
            const { a, b } = compareData;
            const va =
              key === "totalGapTime"
                ? formatDuration(a.totalGapTime)
                : key === "weeklyCommute"
                ? `~${formatDuration(Math.round(a.weeklyCommute * 60))}`
                : a[key as keyof ScoredSchedule];
            const vb =
              key === "totalGapTime"
                ? formatDuration(b.totalGapTime)
                : key === "weeklyCommute"
                ? `~${formatDuration(Math.round(b.weeklyCommute * 60))}`
                : b[key as keyof ScoredSchedule];
            return (
              <Fragment key={key}>
                <div class={styles.compareLabel}>{label}</div>
                <div class={styles.compareValue}>{String(va)}</div>
                <div class={styles.compareValue}>{String(vb)}</div>
              </Fragment>
            );
          })}
          <div class={styles.compareLabel}>{m.different_groups()}</div>
          <div
            class={cx(
              styles.compareValue,
              styles.compareValueSpan,
              styles.compareValueAmber
            )}
          >
            {(() => {
              const { a, b } = compareData;
              const diffs: { course: string; from: string; to: string }[] = [];
              for (const ai of a.schedule) {
                const bi = b.schedule.find(
                  (x) => x.course.courseName === ai.course.courseName
                );
                if (bi && bi.group.name !== ai.group.name) {
                  diffs.push({
                    course: ai.course.courseName,
                    from: ai.group.name,
                    to: bi.group.name,
                  });
                }
              }
              if (diffs.length === 0) return m.none();
              return (
                <div class="flex flex-col gap-1">
                  {diffs.map((d) => (
                    <div key={d.course} class="text-xs">
                      <span class="font-medium">{d.course}:</span>{" "}
                      <span class="text-red-500 line-through">{d.from}</span>{" "}
                      →{" "}
                      <span class="text-green-600 dark:text-green-400">
                        {d.to}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {flags["schedule-diff-summary"] && diffSummary.length > 0 && (
        <div class={styles.diffSummaryCard}>
          <div class={styles.diffSummaryTitle}>{m.diff_summary_title()}</div>
          <div class={styles.diffSummaryList}>
            {diffSummary.map((item) => {
              const toneClass =
                item.winner === "A"
                  ? styles.diffChipA
                  : item.winner === "B"
                  ? styles.diffChipB
                  : styles.diffChipTie;
              return (
                <div key={item.key} class={cx(styles.diffChip, toneClass)}>
                  <span class={styles.diffChipLabel}>{item.label}</span>
                  <span class={styles.diffChipValue}>
                    {item.winner === "tie"
                      ? m.diff_summary_tie()
                      : `${item.winner === "A" ? m.compare_label_a() : m.compare_label_b()} +${item.value}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {flags["conflict-heatmap"] && overlapHeatmap && (
        <div class={styles.heatmapCard}>
          <div class={styles.heatmapTitle}>{m.overlap_heatmap()}</div>
          <div class={styles.heatmapGrid}>
            {([1, 2, 3, 4, 5, 6, 7] as DayNumber[]).map((day) => {
              const minutes = overlapHeatmap[day];
              const ratio =
                maxOverlapMinutes > 0 ? minutes / maxOverlapMinutes : 0;
              const hue = minutes === 0 ? 210 : Math.round(120 - ratio * 120);
              const bg =
                minutes === 0
                  ? "rgba(148,163,184,0.25)"
                  : `hsl(${hue}, 70%, 60%)`;
              return (
                <div key={day} class={styles.heatmapCell}>
                  <div
                    class={styles.heatmapBox}
                    style={{ backgroundColor: bg }}
                    title={`${localizedDayName(day, locale, "long")}: ${formatDuration(
                      minutes
                    )}`}
                  >
                    {minutes > 0 ? formatDuration(minutes) : m.none()}
                  </div>
                  <span class={styles.heatmapLabel}>
                    {localizedDayName(day, locale, "short")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {flags["schedule-diff-overlay"] ? (
        <div class={styles.overlayDiffCard}>
          <div class={styles.overlayDiffTitle}>
            {m.schedule_comparison()} — {m.overlay_label()}
          </div>
          <div class={styles.overlayDiffList}>
            {(() => {
              const { a, b } = compareData;
              const allCourses = [
                ...new Set([
                  ...a.schedule.map((i) => i.course.courseName),
                  ...b.schedule.map((i) => i.course.courseName),
                ]),
              ];
              return allCourses.map((courseName) => {
                const itemA = a.schedule.find(
                  (i) => i.course.courseName === courseName
                );
                const itemB = b.schedule.find(
                  (i) => i.course.courseName === courseName
                );
                const isSame =
                  itemA && itemB && itemA.group.name === itemB.group.name;
                if (isSame && itemA) {
                  return (
                    <div
                      key={courseName}
                      class={cx(styles.overlayDiffRow, styles.overlayDiffShared)}
                    >
                      <span class={styles.overlayDiffBadge}>{m.compare_badge_equal()}</span>
                      <span class="font-medium">{courseName}</span>
                      <span class="text-xs opacity-70">
                        {itemA.group.name} — {itemA.group.lecturer}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={courseName} class="flex flex-col gap-0.5">
                    {itemA && (
                      <div
                        class={cx(
                          styles.overlayDiffRow,
                          styles.overlayDiffRemoved
                        )}
                      >
                        <span class={styles.overlayDiffBadge}>{m.compare_badge_a()}</span>
                        <span class="font-medium">{courseName}</span>
                        <span class="text-xs opacity-70">
                          {itemA.group.name} — {itemA.group.lecturer}
                        </span>
                      </div>
                    )}
                    {itemB && (
                      <div
                        class={cx(
                          styles.overlayDiffRow,
                          styles.overlayDiffAdded
                        )}
                      >
                        <span class={styles.overlayDiffBadge}>{m.compare_badge_b()}</span>
                        <span class="font-medium">{courseName}</span>
                        <span class="text-xs opacity-70">
                          {itemB.group.name} — {itemB.group.lecturer}
                        </span>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        <div class={styles.compareCalendars}>
          <div>
            <div
              class={cx(styles.compareCalendarLabel, styles.compareCalendarLabelA)}
            >
              {m.compare_label_a()}
            </div>
            <CalendarView
              scheduleData={compareData.a}
              daySettings={daySettings}
              dailyCommute={dailyCommute}
              onAddBusyPeriod={onAddBusyPeriod}
              onRemoveBusyPeriod={onRemoveBusyPeriod}
              onLockGroup={onLockGroup}
              courses={courses}
            />
          </div>
          <div>
            <div
              class={cx(styles.compareCalendarLabel, styles.compareCalendarLabelB)}
            >
              {m.compare_label_b()}
            </div>
            <CalendarView
              scheduleData={compareData.b}
              daySettings={daySettings}
              dailyCommute={dailyCommute}
              onAddBusyPeriod={onAddBusyPeriod}
              onRemoveBusyPeriod={onRemoveBusyPeriod}
              onLockGroup={onLockGroup}
              courses={courses}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  compareCard:
    "bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6",
  compareHeader: "flex items-center justify-between mb-6",
  compareTitle:
    "text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100",
  iconMd: "w-5 h-5 opacity-70",
  compareClose:
    "text-sm font-medium px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
  compareGridWrap: "overflow-x-auto",
  compareGrid:
    "grid grid-cols-[minmax(6rem,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 gap-y-3 sm:gap-4 mb-6 min-w-[22rem]",
  compareHeaderSpacer: "",
  compareHeaderCell:
    "font-bold text-xs sm:text-sm uppercase tracking-wide text-center pb-2 border-b-2",
  compareHeaderA:
    "text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  compareHeaderB:
    "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  compareLabel: "text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 self-center",
  compareValue: "text-center font-semibold text-gray-900 dark:text-gray-100",
  compareValueSpan: "col-span-2 text-left",
  compareValueAmber: "bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-sm",
  diffSummaryCard:
    "mb-6 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800",
  diffSummaryTitle:
    "text-xs font-bold uppercase tracking-wide text-gray-500 mb-3",
  diffSummaryList: "flex flex-wrap gap-2",
  diffChip:
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm",
  diffChipLabel: "font-medium opacity-80",
  diffChipValue: "font-bold",
  diffChipA:
    "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800/50 dark:text-indigo-300",
  diffChipB:
    "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800/50 dark:text-rose-300",
  diffChipTie:
    "bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400",
  heatmapCard:
    "mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
  heatmapTitle: "text-xs font-bold uppercase tracking-wider text-gray-500 mb-3",
  heatmapGrid: "grid grid-cols-4 sm:grid-cols-7 gap-2",
  heatmapCell: "flex flex-col items-center",
  heatmapBox:
    "w-full h-8 flex items-center justify-center text-xs font-bold rounded border border-gray-200 dark:border-gray-700",
  heatmapLabel: "text-[10px] uppercase text-center text-gray-500 mt-1",
  compareCalendars: "grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8",
  compareCalendarLabel: "text-center font-bold mb-3 text-lg uppercase",
  compareCalendarLabelA: "text-indigo-600 dark:text-indigo-400",
  compareCalendarLabelB: "text-rose-600 dark:text-rose-400",

  overlayDiffCard: "mt-6 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-inner bg-gray-50/50 dark:bg-gray-900/20",
  overlayDiffTitle: "text-xs font-bold uppercase tracking-wider text-gray-500 p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700",
  overlayDiffList: "p-2 flex flex-col gap-1",
  overlayDiffRow: "flex items-center gap-3 px-3 py-2 rounded-lg text-sm border",
  overlayDiffShared: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300",
  overlayDiffRemoved: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-100",
  overlayDiffAdded: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-100",
  overlayDiffBadge: "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider dark:bg-black/20 bg-black/5",
};
