import { Car, ChevronDown, ChevronUp, Lock, Unlock, X } from "lucide-preact";
import type { JSX } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useLocale } from "@/lib/i18n";
import * as m from "@/paraglide/messages";
import { useSwipe } from "@/hooks/use-swipe";
import { useLecturerRating } from "@/hooks/use-lecturer-ratings";
import { useDataService } from "@/contexts/data-service";
import { CALENDAR_COLORS, localizedDayName } from "@/lib/constants";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { RatingStars } from "@/components/rating-stars";
import { formatClockTime, formatDuration, formatTimeRange, parseTime } from "@/lib/time";
import type {
  BusyPeriod,
  DayNumber,
  DaySettings,
  GapSegment,
  MinMax,
  ScheduleItem,
  ScoredSchedule,
  TimeSlot,
} from "@/lib/types";
import { cx } from "@/lib/cx";

interface CalendarViewProps {
  scheduleData: ScoredSchedule;
  daySettings: DaySettings;
  dailyCommute: MinMax;
  /** When provided, enables drag-to-create busy periods */
  onAddBusyPeriod?: (dayNum: DayNumber, bp: BusyPeriod) => void;
  /** When provided, enables click-to-delete busy periods */
  onRemoveBusyPeriod?: (dayNum: DayNumber, bpIdx: number) => void;
  /** Lock/unlock a group selection */
  onLockGroup?: (courseIdx: number, groupName: string | undefined) => void;
  /** Course list (to map course index) */
  courses?: { courseName: string; lockedGroup?: string }[];
}

/** Group touching/adjacent busy periods into combined visual blocks */
function groupBusyPeriods(periods: BusyPeriod[]): {
  merged: { start: number; end: number };
  members: { bp: BusyPeriod; idx: number }[];
}[] {
  if (periods.length === 0) return [];
  const sorted = periods
    .map((bp, idx) => ({ bp, idx }))
    .sort((a, b) => a.bp.start - b.bp.start);
  const groups: {
    merged: { start: number; end: number };
    members: { bp: BusyPeriod; idx: number }[];
  }[] = [];
  let current = {
    merged: { start: sorted[0].bp.start, end: sorted[0].bp.end },
    members: [sorted[0]],
  };
  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (item.bp.start <= current.merged.end) {
      // touching or overlapping → merge
      current.merged.end = Math.max(current.merged.end, item.bp.end);
      current.members.push(item);
    } else {
      groups.push(current);
      current = {
        merged: { start: item.bp.start, end: item.bp.end },
        members: [item],
      };
    }
  }
  groups.push(current);
  return groups;
}

function scheduleItemKey(item: ScheduleItem) {
  return `${item.course.courseName}:${item.group.name}`;
}

const calendarColorVars = CALENDAR_COLORS.map(
  (c) =>
    ({
      "--cal-bg": c.bg,
      "--cal-text": c.text,
      "--cal-border": c.border,
      "--cal-bg-dark": c.bgDark,
      "--cal-text-dark": c.textDark,
      "--cal-border-dark": c.borderDark,
    }) as JSX.CSSProperties,
);

const calendarDotVars = CALENDAR_COLORS.map(
  (c) =>
    ({
      "--cal-dot": c.bg,
      "--cal-dot-dark": c.bgDark,
    }) as JSX.CSSProperties,
);

const calendarColorClass =
  "bg-[var(--cal-bg)] text-[var(--cal-text)] border-[var(--cal-border)] dark:bg-[var(--cal-bg-dark)] dark:text-[var(--cal-text-dark)] dark:border-[var(--cal-border-dark)]";

export function CalendarView({
  scheduleData,
  daySettings,
  dailyCommute,
  onAddBusyPeriod,
  onRemoveBusyPeriod,
  onLockGroup,
  courses,
}: CalendarViewProps) {
  const locale = useLocale();
  const { ratingsEnabled } = useDataService();
  // Feature: smart day filtering — hide unused weekend days on desktop, with toggle
  const [showAllDays, setShowAllDays] = useState(false);
  const usedDays = useMemo(() => {
    const set = new Set<DayNumber>();
    for (const item of scheduleData.schedule) {
      for (const t of item.group.times) set.add(t.day);
    }
    return set;
  }, [scheduleData.schedule]);
  const dayNums = useMemo<DayNumber[]>(() => {
    if (showAllDays) return [1, 2, 3, 4, 5, 6, 7];
    const active = ([1, 2, 3, 4, 5, 6, 7] as DayNumber[]).filter(d => usedDays.has(d));
    return active.length > 0 ? active : [1, 2, 3, 4, 5];
  }, [showAllDays, usedDays]);

  const { startHour, endHour } = useMemo(() => {
    // Feature 14: dynamic hour range from actual data (includes commute buffer)
    let minHour = 8;
    let maxHour = 21;
    const globalCommuteAvg = (dailyCommute.min + dailyCommute.max) / 2;
    for (const item of scheduleData.schedule) {
      for (const t of item.group.times) {
        const p = parseTime(t.time);
        if (p) {
          const dayCommute = daySettings[t.day]?.commute ?? globalCommuteAvg;
          const legMins = (dayCommute / 2) * 60;
          minHour = Math.min(minHour, Math.floor((p.start - legMins) / 60));
          maxHour = Math.max(maxHour, Math.ceil((p.end + legMins) / 60));
        }
      }
    }
    return {
      startHour: Math.max(0, minHour),
      endHour: Math.min(23, maxHour),
    };
  }, [dailyCommute.max, dailyCommute.min, daySettings, scheduleData.schedule]);

  const hours = useMemo(
    () =>
      Array.from(
        { length: endHour - startHour + 1 },
        (_, i) => startHour + i,
      ),
    [endHour, startHour],
  );
  const pxPerHour = 48;

  // Feature 15: mobile day-by-day tabs
  const [mobileDay, setMobileDay] = useState(0);
  useEffect(() => {
    if (mobileDay >= dayNums.length) setMobileDay(0);
  }, [dayNums.length, mobileDay]);

  // Hour details dialog state
  const [activeDetailedHour, setActiveDetailedHour] = useState<number | null>(null);

  // Drag-to-create busy period state
  const [dragDay, setDragDay] = useState<DayNumber | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const columnRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Hover state for busy period layers
  const [hoveredBusy, setHoveredBusy] = useState<{
    day: DayNumber;
    idx: number;
  } | null>(null);

  // Group detail dialog state — one dialog per course group (not per day)
  const [activeGroupIdx, setActiveGroupIdx] = useState<number | null>(null);
  const activeItem =
    activeGroupIdx !== null ? scheduleData.schedule[activeGroupIdx] : null;
  const activeLecturer = activeItem?.group.lecturer ?? null;
  const { rating: lecturerRating } = useLecturerRating(activeLecturer);

  const yToMinutes = useCallback(
    (y: number, el: HTMLElement): number => {
      const rect = el.getBoundingClientRect();
      const relY = y - rect.top;
      const mins = startHour * 60 + (relY / pxPerHour) * 60;
      // Snap to 15-minute increments
      return Math.round(mins / 15) * 15;
    },
    [startHour],
  );

  const handleMouseDown = useCallback(
    (dayNum: DayNumber, e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
      if (!onAddBusyPeriod) return;
      const el = columnRefs.current[dayNum];
      if (!el) return;
      const mins = yToMinutes(e.clientY, el);
      setDragDay(dayNum);
      setDragStart(mins);
      setDragEnd(mins);
    },
    [onAddBusyPeriod, yToMinutes],
  );

  const handleMouseMove = useCallback(
    (dayNum: DayNumber, e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
      if (dragDay !== dayNum || dragStart === null) return;
      const el = columnRefs.current[dayNum];
      if (!el) return;
      setDragEnd(yToMinutes(e.clientY, el));
    },
    [dragDay, dragStart, yToMinutes],
  );

  const handleMouseUp = useCallback(() => {
    if (
      dragDay !== null &&
      dragStart !== null &&
      dragEnd !== null &&
      onAddBusyPeriod
    ) {
      const s = Math.min(dragStart, dragEnd);
      const e = Math.max(dragStart, dragEnd);
      if (e - s >= 15) {
        // minimum 15 minutes
        onAddBusyPeriod(dragDay, { start: s, end: e });
      }
    }
    setDragDay(null);
    setDragStart(null);
    setDragEnd(null);
  }, [dragDay, dragStart, dragEnd, onAddBusyPeriod]);

  // Swipe to change day on mobile
  const swipeDayHandlers = useSwipe(
    useCallback(
      () => setMobileDay((prev) => Math.min(prev + 1, dayNums.length - 1)),
      [dayNums.length],
    ),
    useCallback(() => setMobileDay((prev) => Math.max(prev - 1, 0)), []),
  );

  return (
    <div class={styles.root} {...swipeDayHandlers}>
      <div class={styles.mobileTabs}>
        {dayNums.map((dayNum, i) => (
          <button type="button"
            key={dayNum}
            onClick={() => setMobileDay(i)}
            class={cx(styles.dayTab, mobileDay === i ? styles.dayTabActive : styles.dayTabIdle)}
          >
            {localizedDayName(dayNum, locale, "long")}
          </button>
        ))}
      </div>

      {/* Legend for mobile — shows color key */}
      <div class={styles.legend}>
        {scheduleData.schedule.map((item: ScheduleItem, cIdx: number) => {
          const colorVars = calendarDotVars[cIdx % calendarDotVars.length];
          const itemKey = scheduleItemKey(item);
          return (
            <span key={itemKey} class={styles.legendItem}>
              <span class={styles.legendDot} style={colorVars} />
              <span class={styles.legendText}>
                {item.course.courseName}
              </span>
            </span>
          );
        })}
      </div>

      {/* Toggle: show all days vs active only */}
      <div class={styles.dayToggleRow}>
        <button
          type="button"
          class={styles.dayToggleBtn}
          onClick={() => setShowAllDays(!showAllDays)}
          aria-label={showAllDays ? m.show_active_days() : m.show_all_days()}
        >
          {showAllDays ? m.show_active_days() : m.show_all_days()}
          {showAllDays ? <ChevronUp class={styles.dayToggleIcon} /> : <ChevronDown class={styles.dayToggleIcon} />}
        </button>
      </div>

      {/* Calendar grid */}
      <div
        class={styles.calendar}
        data-calendar
      >
        <div class={styles.calendarInner}>
          {/* Hour labels */}
          <div class={styles.hourColumn}>
            {hours.map((h) => (
              <button
                type="button"
                key={h}
                class={cx(styles.hourRow, styles.hourRowInteractive)}
                onClick={() => setActiveDetailedHour(h)}
                aria-label={m.classes_at({ 0: formatClockTime(h * 60, locale) })}
              >
                <span class={styles.hourLabel}>
                  {formatClockTime(h * 60, locale)}
                </span>
              </button>
            ))}
          </div>

          {/* Day columns — on mobile show only selected day, on desktop show all */}
          <div
            class={styles.dayColumnsDesktop}
            data-calendar-grid
            style={{ gridTemplateColumns: `repeat(${dayNums.length}, minmax(0, 1fr))` }}
          >
            {dayNums.map((dayNum) => renderDayColumn(dayNum))}
          </div>
          <div
            class={styles.dayColumnsMobile}
            data-calendar-mobile
          >
            {dayNums[mobileDay] && renderDayColumn(dayNums[mobileDay])}
          </div>
        </div>
      </div>

      {(() => {
        const item = activeItem;
        if (!item) return null;
        const courseIdx =
          courses?.findIndex((c) => c.courseName === item.course.courseName) ??
          -1;
        const isLocked =
          courseIdx >= 0 &&
          courses?.[courseIdx]?.lockedGroup === item.group.name;
        return (
          <ResponsiveDialog
            open={!!item}
            onClose={() => setActiveGroupIdx(null)}
            title={m.group_details()}
          >
            <div class={styles.detailWrap}>
              <div class={styles.detailTitle}>
                {item.course.subjectCode && (
                  <span class={styles.detailCode}>
                    {item.course.subjectCode}{" "}
                  </span>
                )}
                {item.course.courseName}
              </div>
              <div class={styles.detailMeta}>
                <div>
                  <span class={styles.detailLabel}>
                    {m.group()}
                  </span>{" "}
                  {item.group.name}
                </div>
                <div>
                  <span class={styles.detailLabel}>
                    {m.lecturer()}
                  </span>{" "}
                  {item.group.lecturer}
                </div>
                <div class={styles.detailSectionTitle}>
                  {m.all_sessions()}
                </div>
                <div class={styles.detailSessionList}>
                  {item.group.times.map((gt) => (
                    <div key={`${gt.day}-${gt.time}-${gt.room}`} class={styles.detailSessionItem}>
                      {localizedDayName(gt.day, locale, "short")}{" "}
                      {formatTimeRange(gt.time, locale)}
                      {gt.room ? ` · ${gt.room}` : ""}
                    </div>
                  ))}
                </div>
              </div>
              {ratingsEnabled && (
                <div class={styles.ratingBox}>
                  <div class={styles.ratingTitle}>
                    {m.lecturer_ratings_title()}
                  </div>
                  {lecturerRating ? (
                    <>
                      <div class={styles.ratingRow}>
                        <RatingStars
                          rating={lecturerRating.rating}
                          className={styles.ratingStars}
                          starClassName={styles.ratingStar}
                          label={m.rating_summary({
                            0: lecturerRating.rating.toFixed(1),
                            1: lecturerRating.reviewCount,
                          })}
                        />
                        <span class={styles.ratingSummary}>
                          {m.rating_summary({
                            0: lecturerRating.rating.toFixed(1),
                            1: lecturerRating.reviewCount,
                          })}
                        </span>
                      </div>
                      {lecturerRating.reviews.some((review) => review.review) && (
                        <div class={styles.ratingReviews}>
                          <div class={styles.ratingReviewsTitle}>
                            {m.recent_reviews()}
                          </div>
                          <ul class={styles.ratingReviewList}>
                            {lecturerRating.reviews
                              .filter((review) => review.review)
                              .slice(0, 3)
                              .map((review) => (
                                <li
                                  key={review.id}
                                  class={styles.ratingReviewItem}
                                >
                                  "{review.review}"
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p class={styles.ratingEmpty}>
                      {m.ratings_coming_soon()}
                    </p>
                  )}
                </div>
              )}
              <div class={styles.detailActions}>
                {onLockGroup && courseIdx >= 0 && (
                  <button type="button"
                    class={cx(styles.detailAction, isLocked ? styles.detailActionLocked : styles.detailActionActive)}
                    onClick={() => {
                      onLockGroup(
                        courseIdx,
                        isLocked ? undefined : item.group.name,
                      );
                      setActiveGroupIdx(null);
                    }}
                  >
                    {isLocked ? (
                      <>
                        <Unlock class={styles.actionIcon} />{" "}
                        {m.unlock_group()}
                      </>
                    ) : (
                      <>
                        <Lock class={styles.actionIcon} />{" "}
                        {m.lock_this_group()}
                      </>
                    )}
                  </button>
                )}
                <button type="button"
                  onClick={() => setActiveGroupIdx(null)}
                  class={styles.detailActionSecondary}
                >
                  {m.close()}
                </button>
              </div>
            </div>
          </ResponsiveDialog>
        );
      })()}

      {/* Hour Details Dialog */}
      {(() => {
        if (activeDetailedHour === null) return null;
        const timeStr = formatClockTime(activeDetailedHour * 60, locale);
        const hourStart = activeDetailedHour * 60;
        const hourEnd = hourStart + 60;
        
        type ClassDetail = {
          item: ScheduleItem;
          slot: TimeSlot;
        };
        const classesAtHour: ClassDetail[] = [];
        
        for (const item of scheduleData.schedule) {
          for (const slot of item.group.times) {
            const parsed = parseTime(slot.time);
            if (!parsed) continue;
            // Class intercects if it starts before hour ends, and ends after hour starts
            if (parsed.start < hourEnd && parsed.end > hourStart) {
              classesAtHour.push({ item, slot });
            }
          }
        }
        
        classesAtHour.sort((a, b) => {
          if (a.slot.day !== b.slot.day) return a.slot.day - b.slot.day;
          const pa = parseTime(a.slot.time);
          const pb = parseTime(b.slot.time);
          if (!pa || !pb) return 0;
          return pa.start - pb.start;
        });

        return (
          <ResponsiveDialog
            open={activeDetailedHour !== null}
            onClose={() => setActiveDetailedHour(null)}
            title={m.classes_at({ 0: timeStr })}
          >
            <div class={styles.detailWrap}>
              {classesAtHour.length === 0 ? (
                <div class={styles.detailMeta}>{m.no_classes_at_hour()}</div>
              ) : (
                <div class={styles.detailSessionList}>
                  {classesAtHour.map(({ item, slot }, i) => (
                    <div key={i} class={styles.hourDetailItem}>
                      <div class={styles.hourDetailHeader}>
                        <span class={styles.hourDetailDay}>{localizedDayName(slot.day, locale, "short")}</span>
                        <span class={styles.hourDetailTime}>{formatTimeRange(slot.time, locale)}</span>
                      </div>
                      <div class={styles.hourDetailCourse}>
                        {item.course.subjectCode ? `${item.course.subjectCode} ` : ""}{item.course.courseName}
                      </div>
                      <div class={styles.hourDetailMeta}>
                        {m.group()} {item.group.name} {item.group.lecturer ? ` • ${item.group.lecturer}` : ""} {slot.room ? ` • ${slot.room}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div class={styles.detailActions}>
                <button type="button" onClick={() => setActiveDetailedHour(null)} class={styles.detailActionSecondary} aria-label="Close detailed view">
                  {m.close()}
                </button>
              </div>
            </div>
          </ResponsiveDialog>
        );
      })()}

      {/* Group sidebar (bottom of calendar) */}
      <div class={styles.sidebarWrap}>
        <h4 class={styles.sidebarTitle}>
          {m.selected_groups()}
        </h4>
        <div class={styles.sidebarGrid} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))" }}>
          {scheduleData.schedule.map((item: ScheduleItem, idx: number) => {
            const colorVars = calendarColorVars[idx % calendarColorVars.length];
            const itemKey = scheduleItemKey(item);
            return (
              <div
                key={itemKey}
                class={styles.sidebarItem}
                style={colorVars}
              >
                <div class={styles.sidebarItemTitle}>
                  {item.course.subjectCode ? (
                    <span class={styles.sidebarItemCode}>
                      {item.course.subjectCode}
                      <br />
                    </span>
                  ) : (
                    ""
                  )}
                  {item.course.courseName}
                </div>
                <div class={styles.sidebarItemMeta}>
                  {item.group.name} — {item.group.lecturer}
                </div>
                {item.group.times.map((ts) => (
                  <div
                    key={`${ts.day}-${ts.time}-${ts.room}`}
                    class={styles.sidebarItemTime}
                  >
                    {localizedDayName(ts.day, locale, "short")}{" "}
                    {formatTimeRange(ts.time, locale)}
                    {ts.room ? ` · ${ts.room}` : ""}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  function renderDayColumn(dayNum: DayNumber) {
    const dayLabel = localizedDayName(dayNum, locale, "long");
    const pref = daySettings[dayNum]?.pref ?? "enabled";
    return (
      <div key={dayNum} class={styles.dayColumn}>
        <div
          class={cx(
            styles.dayHeader,
            pref === "disabled"
              ? styles.dayHeaderDisabled
              : pref === "prioritize"
                ? styles.dayHeaderPrioritize
                : styles.dayHeaderEnabled,
          )}
        >
          {dayLabel}
        </div>
        <div
          ref={(el) => {
            columnRefs.current[dayNum] = el;
          }}
          class={cx(styles.dayBody, onAddBusyPeriod && styles.dayBodyCrosshair)}
          style={{ height: `${(endHour - startHour + 1) * pxPerHour}px` }}
          onMouseDown={(e) => handleMouseDown(dayNum, e)}
          onMouseMove={(e) => handleMouseMove(dayNum, e)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onKeyDown={(e) => {
            if (!onAddBusyPeriod) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              // Add a 1-hour busy period at current hour or first available hour
              const currentHour = new Date().getHours();
              const startMinute = Math.max(currentHour * 60, startHour * 60);
              const endMinute = Math.min(startMinute + 60, endHour * 60);
              if (startMinute < endHour * 60) {
                onAddBusyPeriod(dayNum, { start: startMinute, end: endMinute });
              }
            }
          }}
          tabIndex={onAddBusyPeriod ? 0 : -1}
          role="application"
          aria-label={`${dayLabel}, ${onAddBusyPeriod ? "Press Enter or Space to add busy period" : ""}`}
        >
          {hours.map((h) => (
            <div
              key={h}
              class={styles.hourLine}
              style={{ top: `${(h - startHour) * pxPerHour}px` }}
            />
          ))}

          {/* Drag preview for new busy period */}
          {dragDay === dayNum &&
            dragStart !== null &&
            dragEnd !== null &&
            (() => {
              const s = Math.min(dragStart, dragEnd);
              const e = Math.max(dragStart, dragEnd);
              const top = (s / 60 - startHour) * pxPerHour;
              const height = ((e - s) / 60) * pxPerHour;
              if (height < 2) return null;
              return (
                <div
                  class={styles.dragPreview}
                  style={{ top: `${top}px`, height: `${height}px`, zIndex: 20 }}
                >
                  <span class={styles.dragLabel}>{m.busy()}</span>
                </div>
              );
            })()}

          {/* Commute blocks (before first class / after last class) */}
          {(() => {
            // Gather all class start/end times on this day
            const times: { start: number; end: number }[] = [];
            for (const item of scheduleData.schedule) {
              for (const ts of item.group.times) {
                if (ts.day !== dayNum) continue;
                const p = parseTime(ts.time);
                if (p) times.push(p);
              }
            }
            if (times.length === 0) return null;
            const earliest = Math.min(...times.map((t) => t.start));
            const latest = Math.max(...times.map((t) => t.end));
            // Per-day commute override or global average (round-trip hours)
            const commuteHours =
              daySettings[dayNum]?.commute ??
              (dailyCommute.min + dailyCommute.max) / 2;
            const legMinutes = (commuteHours / 2) * 60; // one-way
            if (legMinutes <= 0) return null;
            const beforeStart = earliest - legMinutes;
            const afterEnd = latest;
            const beforeTop =
              (Math.max(beforeStart, startHour * 60) / 60 - startHour) *
              pxPerHour;
            const beforeHeight =
              (Math.min(legMinutes, earliest - startHour * 60) / 60) *
              pxPerHour;
            const afterTop = (afterEnd / 60 - startHour) * pxPerHour;
            const afterHeight =
              (Math.min(legMinutes, (endHour + 1) * 60 - afterEnd) / 60) *
              pxPerHour;
            return (
              <>
                {beforeHeight > 0 && (
                  <div
                    class={styles.commuteBlock}
                    style={{
                      top: `${beforeTop}px`,
                      height: `${beforeHeight}px`,
                      zIndex: 4,
                    }}
                    title={m.commute_value({ 0: formatDuration(legMinutes) })}
                  >
                    <Car class={styles.commuteIcon} />
                    {beforeHeight >= 20 && (
                      <span class={styles.commuteLabel}>
                        {formatDuration(legMinutes)}
                      </span>
                    )}
                  </div>
                )}
                {afterHeight > 0 && (
                  <div
                    class={styles.commuteBlock}
                    style={{
                      top: `${afterTop}px`,
                      height: `${afterHeight}px`,
                      zIndex: 4,
                    }}
                    title={m.commute_value({ 0: formatDuration(legMinutes) })}
                  >
                    <Car class={styles.commuteIcon} />
                    {afterHeight >= 20 && (
                      <span class={styles.commuteLabel}>
                        {formatDuration(legMinutes)}
                      </span>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {/* Busy period blocks — combined view with hover highlighting */}
          {(() => {
            const periods = daySettings[dayNum]?.busyPeriods ?? [];
            const groups = groupBusyPeriods(periods);
            return groups.map((group) => {
              const top = (group.merged.start / 60 - startHour) * pxPerHour;
              const height =
                ((group.merged.end - group.merged.start) / 60) * pxPerHour;
              const mergedDuration = group.merged.end - group.merged.start;
              const groupKey = `${dayNum}-${group.merged.start}-${group.merged.end}`;
              return (
                <div
                  key={groupKey}
                  class={styles.busyGroup}
                  style={{ top: `${top}px`, height: `${height}px`, zIndex: 3 }}
                >
                  {group.members.map(({ bp, idx: bpIdx }, mi) => {
                    const relTop =
                      mergedDuration > 0
                        ? ((bp.start - group.merged.start) / mergedDuration) *
                          100
                        : 0;
                    const relHeight =
                      mergedDuration > 0
                        ? ((bp.end - bp.start) / mergedDuration) * 100
                        : 100;
                    const isHovered =
                      hoveredBusy?.day === dayNum && hoveredBusy?.idx === bpIdx;
                    const hasMultiple = group.members.length > 1;
                    const memberKey = `${dayNum}-${bp.start}-${bp.end}`;
                    return (
                      <button
                        type="button"
                        key={memberKey}
                        class={cx(
                          styles.busySegment,
                          isHovered
                            ? styles.busySegmentHover
                            : mi % 2 === 0
                              ? styles.busySegmentEven
                              : styles.busySegmentOdd,
                          hasMultiple && mi > 0 && styles.busySegmentDivider,
                        )}
                        style={{ top: `${relTop}%`, height: `${relHeight}%` }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          setHoveredBusy({ day: dayNum, idx: bpIdx });
                        }}
                        onMouseLeave={() => setHoveredBusy(null)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          if (!onRemoveBusyPeriod) return;
                          e.stopPropagation();
                          onRemoveBusyPeriod(dayNum, bpIdx);
                        }}
                        onKeyDown={(e) => {
                          if (!onRemoveBusyPeriod) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemoveBusyPeriod(dayNum, bpIdx);
                          }
                        }}
                        title={`${formatClockTime(
                          bp.start,
                          locale,
                        )} – ${formatClockTime(bp.end, locale)}`}
                        aria-label={`${m.delete_this_busy_period()}: ${formatClockTime(
                          bp.start,
                          locale,
                        )} – ${formatClockTime(bp.end, locale)}`}
                      >
                        {!isHovered && relHeight > 20 && (
                          <span class={styles.busyLabel}>
                            {m.busy()}
                          </span>
                        )}
                        {isHovered && onRemoveBusyPeriod && (
                          <span class={styles.busyHover}>
                            <X class={styles.busyHoverIcon} />
                            <span class={styles.busyHoverTime}>
                              {formatClockTime(
                                bp.start,
                                locale,
                              )}
                              –
                              {formatClockTime(bp.end, locale)}
                            </span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}

          {/* Feature 7: gap highlighting */}
          {scheduleData.gaps
            .filter((g: GapSegment) => g.day === dayNum)
            .map((g: GapSegment) => {
              const top = (g.start / 60 - startHour) * pxPerHour;
              const height = ((g.end - g.start) / 60) * pxPerHour;
              const mins = g.end - g.start;
              return (
                <div
                  key={`gap-${g.day}-${g.start}-${g.end}`}
                  class={styles.gapBlock}
                  style={{ top: `${top}px`, height: `${height}px`, zIndex: 5 }}
                >
                  {mins >= 30 && (
                    <span class={styles.gapLabel}>
                      {formatDuration(mins)} {m.gap_text()}
                    </span>
                  )}
                </div>
              );
            })}

          {/* Course blocks */}
          {scheduleData.schedule.map((item: ScheduleItem, cIdx: number) =>
            item.group.times
              .filter((ts: TimeSlot) => ts.day === dayNum)
              .map((ts: TimeSlot) => {
                const time = parseTime(ts.time);
                if (!time) return null;
                const top = (time.start / 60 - startHour) * pxPerHour;
                const height = ((time.end - time.start) / 60) * pxPerHour;
                const isSelected = activeGroupIdx === cIdx;
                const colorVars = calendarColorVars[cIdx % calendarColorVars.length];
                const itemKey = `${scheduleItemKey(item)}:${ts.day}:${ts.time}:${ts.room}`;
                return (
                  <button
                    type="button"
                    key={itemKey}
                    class={cx(
                      styles.courseBlock,
                      calendarColorClass,
                      isSelected && styles.courseBlockSelected,
                    )}
                    style={{
                      ...colorVars,
                      top: `${top}px`,
                      height: `${height}px`,
                      zIndex: isSelected ? 30 : 10,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGroupIdx(isSelected ? null : cIdx);
                    }}
                    aria-label={`${item.course.courseName} — ${item.group.name}`}
                  >
                    <div class={styles.courseTitle}>
                      {item.course.subjectCode
                        ? `${item.course.subjectCode} `
                        : ""}
                      {item.course.courseName}
                    </div>
                    <div class={styles.courseTime}>
                      {formatTimeRange(ts.time, locale)}
                      {ts.room ? ` • ${ts.room}` : ""}
                    </div>
                  </button>
                );
              }),
          )}
        </div>
      </div>
    );
  }
}

const styles = {
  root: "flex flex-col gap-4",
  mobileTabs: "flex overflow-x-auto pb-2 gap-1 lg:hidden",
  dayTab: "px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer",
  dayTabActive: "bg-blue-600 text-white",
  dayTabIdle: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  hourRowInteractive: "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left",
  hourDetailItem: "p-3 rounded-lg border border-gray-200 bg-gray-50 flex flex-col gap-1 dark:border-gray-700 dark:bg-gray-800/50",
  hourDetailHeader: "flex justify-between items-center text-xs font-semibold uppercase tracking-wider",
  hourDetailDay: "text-blue-600 dark:text-blue-400 font-bold",
  hourDetailTime: "text-gray-500 dark:text-gray-400",
  hourDetailCourse: "font-bold text-sm text-gray-800 dark:text-gray-100",
  hourDetailMeta: "text-xs text-gray-600 dark:text-gray-400 mt-1",
  legend: "flex flex-wrap text-xs pb-2 gap-x-3 gap-y-1 lg:hidden",
  legendItem: "flex items-center gap-1",
  legendDot: "w-2.5 h-2.5 rounded-full shrink-0 bg-[var(--cal-dot)] dark:bg-[var(--cal-dot-dark)]",
  legendText: "text-gray-600 max-w-[120px] truncate dark:text-gray-400",
  calendar: "flex-1 border border-gray-200 bg-white rounded-lg shadow-sm overflow-hidden text-sm dark:border-gray-700 dark:bg-gray-800",
  calendarInner: "flex",
  hourColumn: "w-16 border-r border-gray-200 bg-gray-50 flex flex-col pt-10 dark:border-gray-700 dark:bg-gray-900",
  hourRow: "h-12 border-b border-gray-100 text-xs text-gray-400 pr-1 relative dark:border-gray-700 dark:text-gray-400",
  hourLabel: "absolute -top-2 right-1 whitespace-nowrap",
  dayColumnsDesktop: "flex-1 hidden lg:grid bg-gray-50 dark:bg-gray-900 divide-x divide-gray-100 dark:divide-gray-700",
  dayToggleRow: "flex justify-end pb-1",
  dayToggleBtn: "inline-flex items-center gap-1 text-xs text-gray-500 transition-colors cursor-pointer hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400",
  dayToggleIcon: "w-3 h-3",
  dayColumnsMobile: "flex-1 bg-gray-50 dark:bg-gray-900 lg:hidden",
  detailWrap: "space-y-3",
  detailTitle: "font-bold text-base text-gray-800 dark:text-gray-100",
  detailCode: "font-mono text-xs text-gray-500 dark:text-gray-400",
  detailMeta: "space-y-1 text-sm text-gray-600 dark:text-gray-300",
  detailLabel: "font-semibold",
  detailSectionTitle: "font-semibold mt-2",
  detailSessionList: "space-y-1",
  detailSessionItem: "text-xs text-gray-500 dark:text-gray-400",
  ratingBox: "border border-gray-200 rounded-lg bg-gray-50 p-3 space-y-2 dark:border-gray-700 dark:bg-gray-800/60",
  ratingTitle: "text-xs font-semibold text-gray-700 dark:text-gray-200",
  ratingRow: "flex items-center gap-2",
  ratingStars: "text-amber-500",
  ratingStar: "w-3.5 h-3.5",
  ratingSummary: "text-xs text-gray-500 dark:text-gray-400",
  ratingReviews: "space-y-1",
  ratingReviewsTitle: "text-[10px] uppercase tracking-[0.08em] text-gray-400",
  ratingReviewList: "space-y-1",
  ratingReviewItem: "text-xs text-gray-500 leading-snug dark:text-gray-400",
  ratingEmpty: "text-xs text-gray-500 dark:text-gray-400",
  detailActions: "pt-2 flex flex-col gap-2 sm:flex-row",
  detailAction: "flex-1 flex items-center justify-center px-2 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer gap-1",
  detailActionLocked: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50",
  detailActionActive: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50",
  detailActionSecondary: "flex-1 px-2 py-2 rounded-md text-xs font-medium bg-gray-100 text-gray-600 transition-colors cursor-pointer hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
  actionIcon: "w-3.5 h-3.5",
  sidebarWrap: "w-full flex flex-col gap-2 mt-4",
  sidebarTitle: "font-semibold text-gray-700 dark:text-gray-200",
  sidebarGrid: "grid gap-3",
  sidebarItem:
    "p-3 rounded-lg border-l-4 border-[var(--cal-border)] bg-white shadow-sm text-sm dark:bg-gray-800 dark:border-[var(--cal-border-dark)]",
  sidebarItemTitle: "font-bold text-sm leading-tight mb-1 dark:text-gray-100",
  sidebarItemCode: "font-mono text-xs text-gray-500 dark:text-gray-400",
  sidebarItemMeta: "text-xs text-gray-600 dark:text-gray-400 mt-1",
  sidebarItemTime: "text-[11px] mt-0.5 text-gray-500 dark:text-gray-400",
  dayColumn: "relative flex-1 min-w-0",
  dayHeader: "h-10 border-b border-gray-200 flex items-center justify-center font-semibold dark:border-gray-700",
  dayHeaderDisabled: "bg-red-50 text-red-500 line-through dark:bg-red-900/30",
  dayHeaderPrioritize: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  dayHeaderEnabled: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  dayBody: "relative",
  dayBodyCrosshair: "cursor-crosshair",
  hourLine: "absolute w-full h-12 border-b border-gray-100 dark:border-gray-700/50",
  dragPreview:
    "absolute w-[94%] left-[3%] rounded-lg bg-gray-300/60 border-2 border-dashed border-gray-400 flex items-center justify-center pointer-events-none dark:bg-gray-500/40 dark:border-gray-400",
  dragLabel: "text-[10px] font-medium text-gray-600 dark:text-gray-300",
  commuteBlock:
    "absolute w-[94%] left-[3%] rounded-lg bg-indigo-100/70 border border-dashed border-indigo-300 flex items-center justify-center gap-1 dark:bg-indigo-900/40 dark:border-indigo-600",
  commuteIcon: "w-3 h-3 text-indigo-500 dark:text-indigo-400",
  commuteLabel: "text-[9px] font-medium text-indigo-600 dark:text-indigo-400",
  busyGroup: "absolute w-[94%] left-[3%] rounded-lg overflow-hidden border border-gray-300 dark:border-gray-500",
  busySegment: "absolute w-full flex items-center justify-center transition-[background-color,box-shadow] duration-150",
  busySegmentHover:
    "bg-gray-300/90 shadow-[inset_0_0_0_2px_#60a5fa] dark:bg-gray-500/70 dark:shadow-[inset_0_0_0_2px_#3b82f6]",
  busySegmentEven: "bg-gray-200/70 dark:bg-gray-600/50",
  busySegmentOdd: "bg-gray-200/80 dark:bg-gray-600/70",
  busySegmentDivider: "border-t border-dashed border-gray-400/50 dark:border-gray-400/30",
  busyLabel: "text-[9px] font-medium uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400",
  busyHover: "flex items-center gap-1 text-red-500 dark:text-red-400",
  busyHoverIcon: "w-3.5 h-3.5",
  busyHoverTime: "text-[9px] font-medium",
  gapBlock:
    "absolute w-[94%] left-[3%] rounded-lg opacity-60 bg-red-100 border border-dashed border-red-300 flex items-center justify-center dark:bg-red-900/40 dark:border-red-700",
  gapLabel: "text-[9px] font-medium text-red-500 dark:text-red-400",
  courseBlock:
    "absolute w-[94%] left-[3%] px-1.5 py-0.5 border-l-4 rounded-lg shadow-sm text-[10px] leading-tight text-left cursor-pointer overflow-hidden sm:text-xs",
  courseBlockSelected: "ring-2 ring-blue-500 dark:ring-blue-400",
  courseTitle: "font-bold truncate",
  courseTime: "whitespace-nowrap overflow-hidden text-ellipsis opacity-80",
};

