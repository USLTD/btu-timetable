import { cx } from "@/lib/cx";
import * as m from "@/paraglide/messages";
import { formatDuration } from "@/lib/time";
import type { ScoredSchedule } from "@/lib/types";

interface MetricsDashboardProps {
  schedules: ScoredSchedule[];
}

export function MetricsDashboard({ schedules }: MetricsDashboardProps) {
  if (schedules.length === 0) return null;

  const scores = schedules.map((s) => s.score);
  const freeDaysCounts = schedules.map((s) => s.freeWeekdays);
  const gapTimes = schedules.map((s) => s.totalGapTime);

  const stats = {
    count: schedules.length,
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
    avgFreeDays: (
      freeDaysCounts.reduce((a, b) => a + b, 0) / freeDaysCounts.length
    ).toFixed(1),
    maxFreeDays: Math.max(...freeDaysCounts),
    minGap: Math.min(...gapTimes),
    avgGap: Math.round(
      gapTimes.reduce((a, b) => a + b, 0) / gapTimes.length,
    ),
    pinned: schedules.filter((s) => s.pinned).length,
  };

  return (
    <div class={cx(styles.statsGrid, "no-print")}>
      <div class={cx(styles.statCard, styles.statCardBlue)}>
        <div class={cx(styles.statLabel, styles.statLabelBlue)}>
          {m.results()}
        </div>
        <div class={cx(styles.statValue, styles.statValueBlue)}>
          {stats.count}
          {stats.pinned > 0 && (
            <span class={styles.statPinned}>★{stats.pinned}</span>
          )}
        </div>
      </div>
      <div class={cx(styles.statCard, styles.statCardGreen)}>
        <div class={cx(styles.statLabel, styles.statLabelGreen)}>
          {m.best_free_days()}
        </div>
        <div class={cx(styles.statValue, styles.statValueGreen)}>
          {stats.maxFreeDays}{" "}
          <span class={styles.statSubtle}>
            {m.average_short()} {stats.avgFreeDays}
          </span>
        </div>
      </div>
      <div class={cx(styles.statCard, styles.statCardAmber)}>
        <div class={cx(styles.statLabel, styles.statLabelAmber)}>
          {m.min_gaps()}
        </div>
        <div class={cx(styles.statValue, styles.statValueAmber)}>
          {formatDuration(stats.minGap)}{" "}
          <span class={styles.statSubtle}>
            {m.average_short()} {formatDuration(stats.avgGap)}
          </span>
        </div>
      </div>
      <div class={cx(styles.statCard, styles.statCardPurple)}>
        <div class={cx(styles.statLabel, styles.statLabelPurple)}>
          {m.score_range()}
        </div>
        <div class={cx(styles.statValue, styles.statValuePurple)}>
          {stats.bestScore.toFixed(0)}{" "}
          <span class={styles.statSubtle}>
            — {stats.worstScore.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  statsGrid: "grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6",
  statCard:
    "flex flex-col justify-center rounded-xl p-3 sm:p-4 border transition-colors relative overflow-hidden",
  statCardBlue: "bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50",
  statCardGreen: "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50",
  statCardAmber: "bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50",
  statCardPurple: "bg-purple-50/50 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/50",
  statLabel: "text-xs font-semibold tracking-wide uppercase mb-1",
  statLabelBlue: "text-blue-600 dark:text-blue-400",
  statLabelGreen: "text-emerald-600 dark:text-emerald-400",
  statLabelAmber: "text-amber-600 dark:text-amber-500",
  statLabelPurple: "text-purple-600 dark:text-purple-400",
  statValue: "text-2xl sm:text-3xl font-extrabold flex items-baseline gap-2",
  statValueBlue: "text-blue-900 dark:text-blue-100",
  statValueGreen: "text-emerald-900 dark:text-emerald-100",
  statValueAmber: "text-amber-900 dark:text-amber-100",
  statValuePurple: "text-purple-900 dark:text-purple-100",
  statSubtle: "text-xs font-medium opacity-60 ml-px",
  statPinned: "text-amber-500 text-sm font-bold ml-1",
};
