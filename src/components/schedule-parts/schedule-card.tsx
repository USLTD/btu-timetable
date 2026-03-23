import { cx } from "@/lib/cx";
import * as m from "@/paraglide/messages";
import { formatDuration } from "@/lib/time";
import { localizedDayName } from "@/lib/constants";
import { useLocale } from "@/lib/i18n";
import { Timer, Download, Pencil, Calendar as CalendarIcon, Clock, Star, GitCompareArrows, Shuffle, Image, FileText, Printer, Eye, EyeOff, AlertCircle, ChevronDown } from "lucide-preact";
import { CalendarView } from "@/components/calendar-view";
import type { Course, DayNumber, DaySettings, MinMax, ScoredSchedule } from "@/lib/types";
import type { ImageFormat } from "@/lib/image-export";
import type { Ref } from "preact";

function getScheduleKey(schedule: ScoredSchedule) {
  return schedule.schedule
    .map((item) => `${item.course.courseName}:${item.group.name}`)
    .join("|");
}

interface ScheduleCardProps {
  idx: number;
  originalIdx: number;
  res: ScoredSchedule;
  schedules: ScoredSchedule[];
  daySettings: DaySettings;
  dailyCommute: MinMax;
  courses: Course[];
  
  // UI State props
  compareActive: boolean;
  similarActive: boolean;
  collapsed: boolean;
  editingLabel: number | null;
  labelInputRef: Ref<HTMLInputElement>;
  openExportMenu: number | null;
  exportMenuRef: Ref<HTMLDivElement>;
  similarResults: ScoredSchedule[];

  // Features
  flags: Record<string, boolean>;

  // Actions
  onRenameSchedule: (idx: number, label: string) => void;
  setEditingLabel: (idx: number | null) => void;
  onTogglePin: (idx: number) => void;
  setOpenExportMenu: (idx: number | null) => void;
  handleExportICS: (res: ScoredSchedule, idx: number) => void;
  handleExportHTML: (res: ScoredSchedule, idx: number) => void;
  handleExportPDF: (res: ScoredSchedule, idx: number) => void;
  handleExportImage: (res: ScoredSchedule, idx: number, format: ImageFormat) => void;
  toggleCompare: (idx: number) => void;
  handleTrySimilar: (idx: number, res: ScoredSchedule) => void;
  toggleCollapse: (idx: number) => void;
  setInlineCompare: (data: { a: ScoredSchedule; b: ScoredSchedule } | null) => void;
  setCompareA: (idx: number | null) => void;
  setCompareB: (idx: number | null) => void;

  onAddBusyPeriod?: any;
  onRemoveBusyPeriod?: any;
  onLockGroup?: any;
}

export function ScheduleCard({
  idx,
  originalIdx,
  res,
  daySettings,
  dailyCommute,
  courses,
  compareActive,
  similarActive,
  collapsed,
  editingLabel,
  labelInputRef,
  openExportMenu,
  exportMenuRef,
  similarResults,
  flags,
  onRenameSchedule,
  setEditingLabel,
  onTogglePin,
  setOpenExportMenu,
  handleExportICS,
  handleExportHTML,
  handleExportPDF,
  handleExportImage,
  toggleCompare,
  handleTrySimilar,
  toggleCollapse,
  setInlineCompare,
  setCompareA,
  setCompareB,
  onAddBusyPeriod,
  onRemoveBusyPeriod,
  onLockGroup,
}: ScheduleCardProps) {
  const locale = useLocale();
  const hasFreeDays = res.freeWeekdays > 0;

  const formatFreeDays = (rs: ScoredSchedule): string => {
    const days: DayNumber[] = rs.freeDays ?? [];
    if (days.length === 0) return rs.freeList ?? m.none();
    return days.map((d) => localizedDayName(d, locale, "short")).join(", ");
  };

  return (
    <div
      id={`schedule-card-${originalIdx}`}
      class={cx(
        "schedule-card",
        styles.scheduleCard,
        res.pinned ? styles.scheduleCardPinned : styles.scheduleCardDefault,
      )}
    >
      <div class={styles.scheduleHeader}>
        <div class={styles.scheduleHeaderLeft}>
          <span class={styles.scheduleIndex}>#{idx + 1}</span>
          {editingLabel === originalIdx ? (
            <input ref={labelInputRef} type="text" defaultValue={res.label ?? ''}
              placeholder={m.option_number({ 0: idx + 1 })}
              class={styles.labelInput}
              maxLength={128}
              aria-label={m.option_number({ 0: idx + 1 })}
              onBlur={e => { onRenameSchedule(originalIdx, (e.currentTarget as HTMLInputElement).value.trim()); setEditingLabel(null); }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingLabel(null); }}
            />
          ) : (
            <h3 class={styles.labelTitle}>
              <button
                type="button"
                class={styles.labelButton}
                onClick={() => setEditingLabel(originalIdx)}
              >
                {res.label || m.option_number({ 0: idx + 1 })}
                <Pencil class={styles.labelIcon} />
              </button>
            </h3>
          )}
          {/* Pin toggle */}
          <button type="button" onClick={() => onTogglePin(originalIdx)} title={res.pinned ? m.unpin() : m.pin_this_schedule()}
            aria-label={res.pinned ? m.unpin() : m.pin_this_schedule()}
            class={cx(styles.pinButton, res.pinned ? styles.pinButtonActive : styles.pinButtonInactive)}>
            <Star class={cx(styles.iconMd, res.pinned && styles.starFilled)} />
          </button>
          {/* Export button-dropdown */}
          <div class={styles.exportMenuWrap} ref={openExportMenu === originalIdx ? exportMenuRef : undefined}>
            <div class={styles.exportMenuButtons}>
              <button type="button" onClick={() => handleExportICS(res, idx)} title={m.export_as_ics()}
                aria-label={m.export_as_ics_label()}
                class={cx(styles.exportMenuButton, styles.exportMenuButtonLeft)}>
                <Download class={styles.iconMd} />
              </button>
              <button type="button" onClick={() => setOpenExportMenu(openExportMenu === originalIdx ? null : originalIdx)}
                aria-label={m.more_export_options()}
                class={cx(styles.exportMenuButton, styles.exportMenuButtonRight)}>
                <ChevronDown class={styles.iconXs} />
              </button>
            </div>
            {openExportMenu === originalIdx && (
              <div class={styles.exportMenu}>
                <button type="button" onClick={() => handleExportICS(res, idx)}
                  class={styles.exportMenuItem}>
                  <Download class={styles.iconSm} /> ICS
                </button>
                <button type="button" onClick={() => handleExportHTML(res, idx)}
                  class={styles.exportMenuItem}>
                  <FileText class={styles.iconSm} /> HTML
                </button>
                <button type="button" onClick={() => handleExportPDF(res, idx)}
                  class={styles.exportMenuItem}>
                  <Printer class={styles.iconSm} /> PDF
                </button>
                <div class={styles.exportMenuDivider} />
                <button type="button" onClick={() => handleExportImage(res, idx, 'png')}
                  class={styles.exportMenuItem}>
                  <Image class={styles.iconSm} /> PNG
                </button>
                <button type="button" onClick={() => handleExportImage(res, idx, 'jpeg')}
                  class={styles.exportMenuItem}>
                  <Image class={styles.iconSm} /> JPEG
                </button>
                <button type="button" onClick={() => handleExportImage(res, idx, 'svg')}
                  class={styles.exportMenuItem}>
                  <Image class={styles.iconSm} /> SVG
                </button>
              </div>
            )}
          </div>
          {/* Compare toggle */}
          <button type="button" onClick={() => toggleCompare(idx)}
            title={m.compare()} aria-label={m.compare_schedules()}
            class={cx(
              styles.iconToggle,
              styles.iconToggleIndigo,
              compareActive ? styles.iconToggleActiveIndigo : styles.iconToggleInactive,
            )}>
            <GitCompareArrows class={styles.iconMd} />
          </button>
          {/* Try similar */}
          <button type="button" onClick={() => handleTrySimilar(originalIdx, res)}
            title={m.find_similar_schedules_one_group_swap()} aria-label={m.find_similar_schedules()}
            class={cx(
              styles.iconToggle,
              styles.iconToggleTeal,
              similarActive ? styles.iconToggleActiveTeal : styles.iconToggleInactive,
            )}>
            <Shuffle class={styles.iconMd} />
          </button>
        </div>

        <div class={styles.metricsRow}>
          <div class={cx(styles.metricCard, styles.metricCardGray)}>
            <CalendarIcon class={cx(styles.metricIcon, styles.metricIconBlue)} />
            <span class={styles.metricText}>
              <span class={styles.hideOnMobile}>{m.campus_days_colon()} </span>
              <span class={styles.metricValueBlue}>
                {res.daysOnCampus}
                <span class={styles.showOnMobile}> {m.days()}</span>
              </span>
            </span>
          </div>
          <div class={cx(styles.metricCard, styles.metricCardRed)}>
            <Clock class={cx(styles.metricIcon, styles.metricIconRed)} />
            <span class={styles.metricText}>
              <span class={styles.hideOnMobile}>{m.commute_colon()} </span>
              <span class={styles.metricValueRed}>~{formatDuration(Math.round(res.weeklyCommute * 60))}/{m.wk()}</span>
            </span>
          </div>
          {res.totalGapTime > 0 && (
            <div class={cx(styles.metricCard, styles.metricCardAmber)}>
              <Timer class={cx(styles.metricIcon, styles.metricIconAmber)} />
              <span class={styles.metricText}>
                <span class={styles.hideOnMobile}>{m.gaps_colon()} </span>
                <span class={styles.metricValueAmber}>{formatDuration(res.totalGapTime)}/{m.wk()}</span>
              </span>
            </div>
          )}
          <div class={cx(
            styles.metricCard,
            hasFreeDays ? styles.metricCardGreen : styles.metricCardOrange,
          )}>
            <AlertCircle class={cx(
              styles.metricIcon,
              hasFreeDays ? styles.metricIconGreen : styles.metricIconOrange,
            )} />
            <span class={styles.metricText}>
              <span class={styles.hideOnMobile}>{m.free()} </span>
              <span class={hasFreeDays ? styles.metricValueGreen : styles.metricValueOrange}>{formatFreeDays(res)}</span>
            </span>
          </div>
        </div>
      </div>
      {/* Collapsible calendar (#8) */}
      <button type="button" onClick={() => toggleCollapse(originalIdx)}
        class={cx(styles.collapseButton, "no-print")}>
        {collapsed ? <><Eye class={styles.iconXs} /> {m.show_calendar()}</> : <><EyeOff class={styles.iconXs} /> {m.hide_calendar()}</>}
      </button>
      {!collapsed && (
        <CalendarView scheduleData={res} daySettings={daySettings} dailyCommute={dailyCommute} onAddBusyPeriod={onAddBusyPeriod} onRemoveBusyPeriod={onRemoveBusyPeriod} onLockGroup={onLockGroup} courses={courses} />
      )}

      {/* Try Similar results */}
      {similarResults && similarResults.length > 0 && (
        <div class={styles.similarSection}>
          <h4 class={styles.similarTitle}>
            <Shuffle class={styles.iconSm} />
            {m.similar_schedules_one_group_swap()}
            <span class={styles.similarCount}>({similarResults.length})</span>
          </h4>
          {similarResults.length === 0 ? (
            <p class={styles.similarEmpty}>{m.similar_schedules_no_neighbors()}</p>
          ) : (
            <div class={styles.similarList}>
              {similarResults.map((sim, si) => {
                // Find the swapped group
                const diff = sim.schedule.find((s, i) => res.schedule[i] && s.group.name !== res.schedule[i].group.name);
                const origItem = diff ? res.schedule.find(x => x.course.courseName === diff.course.courseName) : null;
                const simKey = getScheduleKey(sim) || `variant-${si}`;
                return (
                  <div key={simKey} class={styles.similarCard}>
                    <div class={styles.similarCardHeader}>
                      <span class={styles.similarCardTitle}>
                        {diff && origItem ? (
                          <>{diff.course.courseName}: <span class={styles.similarDiffOld}>{origItem.group.name}</span> → <span class={styles.similarDiffNew}>{diff.group.name}</span></>
                        ) : m.variant_number({ 0: si + 1 })}
                      </span>
                      <span class={styles.similarScore}>{m.score()}: {sim.score.toFixed(0)}</span>
                      {flags["schedule-similar-diff"] && flags["schedule-diff-overlay"] && (
                        <button
                          type="button"
                          class={styles.similarCompareButton}
                          onClick={() => {
                            setInlineCompare({ a: res, b: sim });
                            setCompareA(null);
                            setCompareB(null);
                            requestAnimationFrame(() => {
                              document
                                .getElementById("schedule-compare-overlay")
                                ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            });
                          }}
                          aria-label={m.compare_schedules()}
                        >
                          <GitCompareArrows class={styles.iconXs} />
                        </button>
                      )}
                    </div>
                    <div class={styles.similarMeta}>
                      <span>{sim.daysOnCampus} {m.days()}</span>
                      <span>{formatDuration(sim.totalGapTime)} {m.gaps()}</span>
                      <span>~{formatDuration(Math.round(sim.weeklyCommute * 60))} {m.commute()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  scheduleCard: "bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 dark:bg-gray-800",
  scheduleCardDefault: "border border-gray-100 dark:border-gray-700",
  scheduleCardPinned: "border border-yellow-400 ring-2 ring-yellow-200 dark:border-yellow-600 dark:ring-yellow-800",
  scheduleHeader: "flex flex-wrap items-center justify-between gap-2 mb-4 sm:gap-3",
  scheduleHeaderLeft: "flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0",
  scheduleIndex: "bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm sm:w-8 sm:h-8 sm:text-sm",
  labelInput: "text-lg font-bold text-gray-800 bg-transparent border-0 border-b-2 border-blue-400 outline-none px-1 w-full sm:w-40 dark:text-gray-100",
  labelTitle: "text-lg font-bold text-gray-800 dark:text-gray-100",
  labelButton: "inline-flex items-center gap-1 text-left cursor-pointer group",
  labelIcon: "w-3.5 h-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600",
  pinButton: "p-2 rounded-md transition-colors cursor-pointer",
  pinButtonActive: "text-yellow-500",
  pinButtonInactive: "text-gray-300 hover:text-yellow-400 dark:text-gray-600",
  starFilled: "fill-current",
  scheduleHeaderRight: "flex flex-wrap items-center gap-1 ml-auto shrink-0",
  exportMenuWrap: "relative",
  exportMenuButtons: "flex items-center",
  exportMenuButton: "p-2 text-gray-400 transition-colors cursor-pointer hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400",
  exportMenuButtonLeft: "border-r border-gray-200 dark:border-gray-600",
  exportMenuButtonRight: "rounded-r-md",
  exportMenu: "absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] py-1 dark:bg-gray-800 dark:border-gray-600",
  exportMenuItem: "w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors cursor-pointer hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
  exportMenuDivider: "border-t border-gray-200 my-1 dark:border-gray-600",
  iconToggle: "p-2 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center w-9 h-9",
  iconToggleInactive: "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400",
  iconToggleIndigo: "hover:text-indigo-500 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20",
  iconToggleActiveIndigo: "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/30",
  iconToggleTeal: "hover:text-teal-500 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/20",
  iconToggleActiveTeal: "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30",
  collapseButton: "w-full flex items-center justify-center gap-1.5 py-1.5 mt-2 mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors dark:hover:text-gray-300 dark:hover:bg-gray-800/50",
  iconXs: "w-3.5 h-3.5",
  iconSm: "w-4 h-4",
  iconMd: "w-5 h-5",
  metricsRow: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-2 w-full",
  metricCard: "flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 rounded-lg border text-xs sm:text-sm transition-colors",
  metricIcon: "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0",
  metricText: "flex items-baseline gap-1 min-w-0 truncate",
  metricCardGray: "bg-gray-50/50 border-gray-200 text-gray-600 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400",
  metricCardGreen: "bg-emerald-50/50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-300",
  metricCardRed: "bg-rose-50/50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-300",
  metricCardAmber: "bg-amber-50/50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-300",
  metricCardOrange: "bg-orange-50/50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-300",
  metricIconBlue: "text-blue-500 dark:text-blue-400",
  metricIconGreen: "text-emerald-500 dark:text-emerald-400",
  metricIconRed: "text-rose-500 dark:text-rose-400",
  metricIconAmber: "text-amber-500 dark:text-amber-400",
  metricIconOrange: "text-orange-500 dark:text-orange-400",
  metricValueBlue: "font-semibold text-blue-700 dark:text-blue-300",
  metricValueGreen: "font-semibold text-emerald-700 dark:text-emerald-300",
  metricValueRed: "font-semibold text-rose-700 dark:text-rose-300",
  metricValueAmber: "font-semibold text-amber-700 dark:text-amber-300",
  metricValueOrange: "font-semibold text-orange-700 dark:text-orange-300",
  hideOnMobile: "hidden sm:inline opacity-70",
  showOnMobile: "inline sm:hidden opacity-70 font-normal",
  similarSection: "mt-4 sm:mt-6 border-t border-dashed border-gray-200 dark:border-gray-700 pt-4",
  similarTitle: "text-sm font-bold text-teal-800 flex items-center gap-2 mb-3 dark:text-teal-400",
  similarCount: "text-teal-500/70 font-normal",
  similarEmpty: "text-sm text-gray-500 italic",
  similarList: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
  similarCard: "bg-teal-50 border border-teal-100 rounded-lg p-3 relative hover:shadow-sm transition-shadow dark:bg-teal-900/10 dark:border-teal-800/50",
  similarCardHeader: "flex items-start justify-between gap-2 mb-3",
  similarCardTitle: "text-xs font-semibold text-teal-900 dark:text-teal-200 pr-6",
  similarDiffOld: "text-rose-600 line-through opacity-70 dark:text-rose-400",
  similarDiffNew: "text-emerald-600 dark:text-emerald-400",
  similarScore: "text-xs font-black text-teal-600 bg-white/60 px-2 py-0.5 rounded shadow-sm border border-teal-100/50 shrink-0 dark:text-teal-300 dark:bg-teal-950/50 dark:border-teal-800/50",
  similarCompareButton: "absolute top-2 right-2 p-1.5 text-teal-600 hover:bg-teal-100 rounded bg-teal-50 border border-teal-200 transition-colors dark:text-teal-400 dark:hover:bg-teal-800/50 dark:bg-teal-900/30 dark:border-teal-700/50",
  similarMeta: "flex flex-wrap gap-2 text-[10px] text-teal-700/70 font-medium dark:text-teal-400/60",
};
