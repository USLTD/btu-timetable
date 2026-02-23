import type { BusyPeriod, DayNumber, DaySettings, GapSegment, MinMax, ScheduleItem, ScoredSchedule, TimeSlot } from '../types.ts';
import { CALENDAR_COLORS, localizedDayName } from '../lib/constants.ts';
import { parseTime, formatDuration, formatTime } from '../lib/time.ts';
import { Trans, useLingui } from '@lingui/react/macro';
import { useRef, useState, useCallback } from 'react';
import { Car, X, Lock, Unlock } from 'lucide-react';

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
function groupBusyPeriods(periods: BusyPeriod[]): { merged: { start: number; end: number }; members: { bp: BusyPeriod; idx: number }[] }[] {
  if (periods.length === 0) return [];
  const sorted = periods.map((bp, idx) => ({ bp, idx })).sort((a, b) => a.bp.start - b.bp.start);
  const groups: { merged: { start: number; end: number }; members: { bp: BusyPeriod; idx: number }[] }[] = [];
  let current = { merged: { start: sorted[0].bp.start, end: sorted[0].bp.end }, members: [sorted[0]] };
  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (item.bp.start <= current.merged.end) {
      // touching or overlapping → merge
      current.merged.end = Math.max(current.merged.end, item.bp.end);
      current.members.push(item);
    } else {
      groups.push(current);
      current = { merged: { start: item.bp.start, end: item.bp.end }, members: [item] };
    }
  }
  groups.push(current);
  return groups;
}

export function CalendarView({ scheduleData, daySettings, dailyCommute, onAddBusyPeriod, onRemoveBusyPeriod, onLockGroup, courses }: CalendarViewProps) {
  const { t, i18n } = useLingui();
  const locale = i18n.locale;
  const allDayNums: DayNumber[] = [1, 2, 3, 4, 5, 6];
  // Feature 14: only show days that have classes or are ≤ Fri
  const usedDays = new Set(scheduleData.schedule.flatMap(i => i.group.times.map(t => t.day)));
  const dayNums = allDayNums.filter(d => d <= 5 || usedDays.has(d));

  // Feature 14: dynamic hour range from actual data (includes commute buffer)
  let minHour = 8, maxHour = 21;
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
  minHour = Math.max(0, minHour);
  maxHour = Math.min(23, maxHour);
  const startHour = minHour;
  const endHour = maxHour;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const pxPerHour = 48;

  // Feature 15: mobile day-by-day tabs
  const [mobileDay, setMobileDay] = useState(0);

  // Drag-to-create busy period state
  const [dragDay, setDragDay] = useState<DayNumber | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const columnRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Hover state for busy period layers
  const [hoveredBusy, setHoveredBusy] = useState<{ day: DayNumber; idx: number } | null>(null);

  // Group detail popover state — one popover per course group (not per day)
  const [popoverCIdx, setPopoverCIdx] = useState<number | null>(null);

  const yToMinutes = useCallback((y: number, el: HTMLElement): number => {
    const rect = el.getBoundingClientRect();
    const relY = y - rect.top;
    const mins = startHour * 60 + (relY / pxPerHour) * 60;
    // Snap to 15-minute increments
    return Math.round(mins / 15) * 15;
  }, [startHour, pxPerHour]);

  const handleMouseDown = useCallback((dayNum: DayNumber, e: React.MouseEvent<HTMLDivElement>) => {
    if (!onAddBusyPeriod) return;
    const el = columnRefs.current[dayNum];
    if (!el) return;
    const mins = yToMinutes(e.clientY, el);
    setDragDay(dayNum);
    setDragStart(mins);
    setDragEnd(mins);
  }, [onAddBusyPeriod, yToMinutes]);

  const handleMouseMove = useCallback((dayNum: DayNumber, e: React.MouseEvent<HTMLDivElement>) => {
    if (dragDay !== dayNum || dragStart === null) return;
    const el = columnRefs.current[dayNum];
    if (!el) return;
    setDragEnd(yToMinutes(e.clientY, el));
  }, [dragDay, dragStart, yToMinutes]);

  const handleMouseUp = useCallback(() => {
    if (dragDay !== null && dragStart !== null && dragEnd !== null && onAddBusyPeriod) {
      const s = Math.min(dragStart, dragEnd);
      const e = Math.max(dragStart, dragEnd);
      if (e - s >= 15) { // minimum 15 minutes
        onAddBusyPeriod(dragDay, { start: s, end: e });
      }
    }
    setDragDay(null);
    setDragStart(null);
    setDragEnd(null);
  }, [dragDay, dragStart, dragEnd, onAddBusyPeriod]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Mobile day tabs */}
      <div className="lg:hidden flex gap-1 overflow-x-auto pb-2 no-print">
        {dayNums.map((dayNum, idx) => (
          <button key={dayNum} onClick={() => setMobileDay(idx)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${mobileDay === idx
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>{localizedDayName(dayNum, locale, 'short')}</button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden text-sm" data-calendar>
        <div className="flex">
          {/* Hour labels */}
          <div className="w-12 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col pt-10">
            {hours.map(h => (
              <div key={h} className="h-12 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 pr-1 relative">
                <span className="absolute -top-2 right-1">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns — on mobile show only selected day, on desktop show all */}
          <div className={`flex-1 divide-x divide-gray-100 dark:divide-gray-700 bg-gray-50 dark:bg-gray-900 hidden lg:grid`} data-calendar-grid style={{ gridTemplateColumns: `repeat(${dayNums.length}, minmax(0, 1fr))` }}>
            {dayNums.map((dayNum) => renderDayColumn(dayNum))}
          </div>
          <div className="flex-1 lg:hidden bg-gray-50 dark:bg-gray-900" data-calendar-mobile>
            {dayNums[mobileDay] && renderDayColumn(dayNums[mobileDay])}
          </div>
        </div>
      </div>

      {/* Single popover for selected course group */}
      {popoverCIdx !== null && scheduleData.schedule[popoverCIdx] && (() => {
        const item = scheduleData.schedule[popoverCIdx];
        const courseIdx = courses?.findIndex(c => c.courseName === item.course.courseName) ?? -1;
        const isLocked = courseIdx >= 0 && courses?.[courseIdx]?.lockedGroup === item.group.name;
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 text-xs"
            onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2">
              {item.course.subjectCode && <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{item.course.subjectCode} </span>}
              {item.course.courseName}
            </div>
            <div className="space-y-1 text-gray-600 dark:text-gray-300">
              <div><span className="font-semibold"><Trans>Group:</Trans></span> {item.group.name}</div>
              <div><span className="font-semibold"><Trans>Lecturer:</Trans></span> {item.group.lecturer}</div>
              <div className="font-semibold mt-1"><Trans>All sessions:</Trans></div>
              {item.group.times.map((gt, gi) => (
                <div key={gi} className="pl-2">{localizedDayName(gt.day, locale, 'short')} {gt.time} — {gt.room}</div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {onLockGroup && courseIdx >= 0 && (
                <button
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${isLocked
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                    }`}
                  onClick={() => { onLockGroup(courseIdx, isLocked ? undefined : item.group.name); setPopoverCIdx(null); }}>
                  {isLocked ? <><Unlock className="w-3.5 h-3.5" /> <Trans>Unlock Group</Trans></> : <><Lock className="w-3.5 h-3.5" /> <Trans>Lock This Group</Trans></>}
                </button>
              )}
              <button onClick={() => setPopoverCIdx(null)}
                className="px-2 py-1.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <Trans>Close</Trans>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Group sidebar */}
      <div className="w-full lg:w-64 flex flex-col gap-2">
        <h4 className="font-semibold text-gray-700 dark:text-gray-200"><Trans>Selected Groups</Trans></h4>
        {scheduleData.schedule.map((item: ScheduleItem, idx: number) => {
          const colorClasses = CALENDAR_COLORS[idx % CALENDAR_COLORS.length];
          const borderClass = colorClasses.split(' ').filter(c => c.startsWith('border-') || c.startsWith('dark:border-')).join(' ');
          return (
            <div key={idx} className={`p-2 rounded border-l-4 text-sm bg-white dark:bg-gray-800 shadow-sm ${borderClass}`}>
              <div className="font-bold text-sm leading-tight mb-1 dark:text-gray-100">
                {item.course.subjectCode ? <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{item.course.subjectCode}<br /></span> : ''}
                {item.course.courseName}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-xs">{item.group.name} — {item.group.lecturer}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  function renderDayColumn(dayNum: DayNumber) {
    const dayLabel = localizedDayName(dayNum, locale, 'short');
    const pref = daySettings[dayNum]?.pref ?? 'enabled';
    return (
      <div key={dayNum} className="relative">
        <div className={`h-10 border-b border-gray-200 dark:border-gray-700 text-center font-semibold flex items-center justify-center ${pref === 'disabled' ? 'bg-red-50 dark:bg-red-900/30 text-red-500 line-through' :
          pref === 'prioritize' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
            'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          }`}>
          {dayLabel}
        </div>
        <div
          ref={(el) => { columnRefs.current[dayNum] = el; }}
          className={`relative ${onAddBusyPeriod ? 'cursor-crosshair' : ''}`}
          style={{ height: `${(endHour - startHour + 1) * pxPerHour}px` }}
          onMouseDown={(e) => handleMouseDown(dayNum, e)}
          onMouseMove={(e) => handleMouseMove(dayNum, e)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {hours.map(h => (
            <div key={h} className="absolute w-full h-12 border-b border-gray-100 dark:border-gray-700/50" style={{ top: `${(h - startHour) * pxPerHour}px` }} />
          ))}

          {/* Drag preview for new busy period */}
          {dragDay === dayNum && dragStart !== null && dragEnd !== null && (() => {
            const s = Math.min(dragStart, dragEnd);
            const e = Math.max(dragStart, dragEnd);
            const top = ((s / 60) - startHour) * pxPerHour;
            const height = ((e - s) / 60) * pxPerHour;
            if (height < 2) return null;
            return (
              <div
                className="absolute w-[94%] left-[3%] rounded bg-gray-300/60 dark:bg-gray-500/40 border-2 border-dashed border-gray-400 dark:border-gray-400 flex items-center justify-center pointer-events-none"
                style={{ top: `${top}px`, height: `${height}px`, zIndex: 20 }}
              >
                <span className="text-[10px] text-gray-600 dark:text-gray-300 font-medium">{t`Busy`}</span>
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
            const earliest = Math.min(...times.map(t => t.start));
            const latest = Math.max(...times.map(t => t.end));
            // Per-day commute override or global average (round-trip hours)
            const commuteHours = daySettings[dayNum]?.commute ?? (dailyCommute.min + dailyCommute.max) / 2;
            const legMinutes = (commuteHours / 2) * 60; // one-way
            if (legMinutes <= 0) return null;
            const beforeStart = earliest - legMinutes;
            const afterEnd = latest;
            const beforeTop = ((Math.max(beforeStart, startHour * 60) / 60) - startHour) * pxPerHour;
            const beforeHeight = (Math.min(legMinutes, earliest - startHour * 60) / 60) * pxPerHour;
            const afterTop = ((afterEnd / 60) - startHour) * pxPerHour;
            const afterHeight = (Math.min(legMinutes, (endHour + 1) * 60 - afterEnd) / 60) * pxPerHour;
            return (
              <>
                {beforeHeight > 0 && (
                  <div
                    className="absolute w-[94%] left-[3%] rounded bg-indigo-100/70 dark:bg-indigo-900/40 border border-dashed border-indigo-300 dark:border-indigo-600 flex items-center justify-center gap-1"
                    style={{ top: `${beforeTop}px`, height: `${beforeHeight}px`, zIndex: 4 }}
                    title={t`Commute: ${formatDuration(legMinutes)}`}
                  >
                    <Car className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    {beforeHeight >= 20 && <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium">{formatDuration(legMinutes)}</span>}
                  </div>
                )}
                {afterHeight > 0 && (
                  <div
                    className="absolute w-[94%] left-[3%] rounded bg-indigo-100/70 dark:bg-indigo-900/40 border border-dashed border-indigo-300 dark:border-indigo-600 flex items-center justify-center gap-1"
                    style={{ top: `${afterTop}px`, height: `${afterHeight}px`, zIndex: 4 }}
                    title={t`Commute: ${formatDuration(legMinutes)}`}
                  >
                    <Car className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    {afterHeight >= 20 && <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium">{formatDuration(legMinutes)}</span>}
                  </div>
                )}
              </>
            );
          })()}

          {/* Busy period blocks — combined view with hover highlighting */}
          {(() => {
            const periods = daySettings[dayNum]?.busyPeriods ?? [];
            const groups = groupBusyPeriods(periods);
            return groups.map((group, gi) => {
              const top = ((group.merged.start / 60) - startHour) * pxPerHour;
              const height = ((group.merged.end - group.merged.start) / 60) * pxPerHour;
              const mergedDuration = group.merged.end - group.merged.start;
              return (
                <div key={`busy-group-${gi}`}
                  className="absolute w-[94%] left-[3%] rounded overflow-hidden border border-gray-300 dark:border-gray-500"
                  style={{ top: `${top}px`, height: `${height}px`, zIndex: 3 }}
                >
                  {group.members.map(({ bp, idx: bpIdx }, mi) => {
                    const relTop = mergedDuration > 0 ? ((bp.start - group.merged.start) / mergedDuration) * 100 : 0;
                    const relHeight = mergedDuration > 0 ? ((bp.end - bp.start) / mergedDuration) * 100 : 100;
                    const isHovered = hoveredBusy?.day === dayNum && hoveredBusy?.idx === bpIdx;
                    const hasMultiple = group.members.length > 1;
                    return (
                      <div key={`busy-${bpIdx}`}
                        className={`absolute w-full flex items-center justify-center transition-all
                          ${isHovered
                            ? 'bg-gray-300/90 dark:bg-gray-500/70 ring-2 ring-inset ring-blue-400 dark:ring-blue-500'
                            : mi % 2 === 0
                              ? 'bg-gray-200/70 dark:bg-gray-600/50'
                              : 'bg-gray-250/80 dark:bg-gray-600/70'}
                          ${hasMultiple && mi > 0 ? 'border-t border-dashed border-gray-400/50 dark:border-gray-400/30' : ''}`}
                        style={{ top: `${relTop}%`, height: `${relHeight}%` }}
                        onMouseEnter={(e) => { e.stopPropagation(); setHoveredBusy({ day: dayNum, idx: bpIdx }); }}
                        onMouseLeave={() => setHoveredBusy(null)}
                        onMouseDown={(e) => e.stopPropagation()}
                        title={`${formatTime(bp.start)} – ${formatTime(bp.end)}`}
                      >
                        {!isHovered && relHeight > 20 && (
                          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                            {t`Busy`}
                          </span>
                        )}
                        {isHovered && onRemoveBusyPeriod && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveBusyPeriod(dayNum, bpIdx); }}
                            className="flex items-center gap-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title={t`Delete this busy period`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-medium">{formatTime(bp.start)}–{formatTime(bp.end)}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}

          {/* Feature 7: gap highlighting */}
          {scheduleData.gaps
            .filter((g: GapSegment) => g.day === dayNum)
            .map((g: GapSegment, gi: number) => {
              const top = ((g.start / 60) - startHour) * pxPerHour;
              const height = ((g.end - g.start) / 60) * pxPerHour;
              const mins = g.end - g.start;
              return (
                <div key={`gap-${gi}`}
                  className="absolute w-[94%] left-[3%] rounded opacity-60 bg-red-100 dark:bg-red-900/40 border border-dashed border-red-300 dark:border-red-700 flex items-center justify-center"
                  style={{ top: `${top}px`, height: `${height}px`, zIndex: 5 }}
                >
                  {mins >= 30 && <span className="text-[9px] text-red-500 dark:text-red-400 font-medium">{formatDuration(mins)} gap</span>}
                </div>
              );
            })}

          {/* Course blocks */}
          {scheduleData.schedule.map((item: ScheduleItem, cIdx: number) =>
            item.group.times
              .filter((ts: TimeSlot) => ts.day === dayNum)
              .map((ts: TimeSlot, tIdx: number) => {
                const time = parseTime(ts.time);
                if (!time) return null;
                const top = ((time.start / 60) - startHour) * pxPerHour;
                const height = ((time.end - time.start) / 60) * pxPerHour;
                const isSelected = popoverCIdx === cIdx;
                return (
                  <div
                    key={`${cIdx}-${tIdx}`}
                    className={`absolute w-[94%] left-[3%] px-1 py-0.5 border-l-4 overflow-visible rounded shadow-sm text-[10px] sm:text-xs leading-tight cursor-pointer ${CALENDAR_COLORS[cIdx % CALENDAR_COLORS.length]} ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
                    style={{ top: `${top}px`, height: `${height}px`, zIndex: isSelected ? 30 : 10 }}
                    onClick={(e) => { e.stopPropagation(); setPopoverCIdx(isSelected ? null : cIdx); }}
                    role="button" tabIndex={0} aria-label={`${item.course.courseName} — ${item.group.name}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPopoverCIdx(isSelected ? null : cIdx); } }}
                  >
                    <div className="font-bold truncate">
                      {item.course.subjectCode ? `${item.course.subjectCode} ` : ''}{item.course.courseName}
                    </div>
                    <div className="truncate">{ts.time} • {ts.room}</div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    );
  }
}
