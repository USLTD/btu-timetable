import { useState, useCallback, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, AlertCircle, Download, Star, Timer, GitCompareArrows, Shuffle, Info, Bell, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Trans, useLingui } from '@lingui/react/macro';
import type { BusyPeriod, Course, DayNumber, DaySettings, InstructorPref, MinMax, RejectionReason, ScoredSchedule } from '../types.ts';
import { CalendarView } from './calendar-view.tsx';
import { localizedDayName } from '../lib/constants.ts';
import { generateICS, downloadICS } from '../lib/ics-export.ts';
import { trySimilar } from '../lib/scheduler.ts';
import { formatDuration } from '../lib/time.ts';

interface ScheduleResultsProps {
  schedules: ScoredSchedule[];
  daySettings: DaySettings;
  dailyCommute: MinMax;
  classesPerDay: MinMax;
  maxOverlap: number;
  maxResults: number;
  instructorPrefs?: InstructorPref[];
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

export function ScheduleResults({ schedules, daySettings, dailyCommute, classesPerDay, maxOverlap, maxResults, instructorPrefs, hasSearched, loading, limitWarning, rejections, courses, onTogglePin, onRenameSchedule, onLockGroup, onAddBusyPeriod, onRemoveBusyPeriod }: ScheduleResultsProps) {
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);
  const [similarResults, setSimilarResults] = useState<Record<number, ScoredSchedule[]>>({});
  const [showRejections, setShowRejections] = useState(false);
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const { t, i18n } = useLingui();

  /** Format the free days list using ICU-localized day names */
  const formatFreeDays = (res: ScoredSchedule): string => {
    const days: DayNumber[] = res.freeDays ?? [];
    if (days.length === 0) return res.freeList ?? t`None`;
    return days.map(d => localizedDayName(d, i18n.locale, 'short')).join(', ');
  };

  const handleExportICS = (res: ScoredSchedule, idx: number) => {
    const ics = generateICS(res.schedule, reminderMinutes);
    downloadICS(ics, `schedule-option-${idx + 1}.ics`);
  };

  const handleTrySimilar = useCallback((idx: number, res: ScoredSchedule) => {
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
      instructorPrefs,
    };
    const similar = trySimilar(res, courses, options);
    setSimilarResults(prev => ({ ...prev, [idx]: similar }));
  }, [daySettings, dailyCommute, courses, similarResults]);

  const toggleCompare = useCallback((idx: number) => {
    if (compareA === idx) { setCompareA(null); return; }
    if (compareB === idx) { setCompareB(null); return; }
    if (compareA === null) { setCompareA(idx); return; }
    if (compareB === null) { setCompareB(idx); return; }
    // Both set: replace B
    setCompareB(idx);
  }, [compareA, compareB]);

  const isComparing = compareA !== null && compareB !== null;

  // Feature 4: pinned first, then by score
  const sorted = [...schedules].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  /** Summarize rejections into a readable list */
  const rejectionSummary = (): string[] => {
    const msgs: string[] = [];
    const counts: Record<string, number> = {};
    for (const r of rejections) {
      let key: string;
      switch (r.type) {
        case 'day_disabled': key = t`"${r.course}" (${r.group}) falls on disabled day ${localizedDayName(r.day, i18n.locale, 'short')}`; break;
        case 'outside_hours': key = t`"${r.course}" (${r.group}) is outside allowed hours on ${localizedDayName(r.day, i18n.locale, 'short')}`; break;
        case 'busy_period': key = t`"${r.course}" (${r.group}) overlaps a busy period on ${localizedDayName(r.day, i18n.locale, 'short')}`; break;
        case 'too_many_classes': key = t`"${r.course}" (${r.group}) exceeds max classes on ${localizedDayName(r.day, i18n.locale, 'short')}`; break;
        case 'overlap': key = t`"${r.course}" (${r.group}) overlaps with "${r.conflictCourse}" (${r.conflictGroup})`; break;
        case 'min_classes': key = t`Day ${localizedDayName(r.day, i18n.locale, 'short')} doesn't meet minimum classes`; break;
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
      {/* Rejection explanations */}
      {hasSearched && !loading && rejections.length > 0 && (
        <div className="mb-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl shadow-sm overflow-hidden">
          <button onClick={() => setShowRejections(!showRejections)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
              <Info className="w-4 h-4" />
              <span className="text-sm font-semibold"><Trans>Why were some combinations rejected?</Trans> ({rejections.length})</span>
            </div>
            {showRejections ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-purple-500" />}
          </button>
          {showRejections && (
            <ul className="px-4 pb-3 space-y-1 text-sm text-purple-700 dark:text-purple-300 border-t border-purple-200 dark:border-purple-700 pt-2">
              {rejectionSummary().map((msg, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span>{msg}</span>
                </li>
              ))}
              {rejections.length > 12 && <li className="text-purple-400 italic">…{t`and ${rejections.length - 12} more`}</li>}
            </ul>
          )}
        </div>
      )}

      {limitWarning && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-xl text-yellow-800 dark:text-yellow-200 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold"><Trans>Too many permutations!</Trans></p>
            <p className="text-sm"><Trans>To prevent your browser from crashing, the app stopped early. Results shown are the best from the checked batch.</Trans></p>
          </div>
        </div>
      )}

      {hasSearched && !loading && schedules.length === 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 p-8 rounded-xl text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-orange-800 dark:text-orange-200 mb-2"><Trans>No Valid Schedules Found!</Trans></h3>
          <p className="text-orange-700 dark:text-orange-300"><Trans>All combinations violate your limits. Try relaxing some constraints!</Trans></p>
        </div>
      )}

      {/* Comparison view */}
      {isComparing && sorted[compareA!] && sorted[compareB!] && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5" />
              <Trans>Schedule Comparison</Trans>
            </h3>
            <button onClick={() => { setCompareA(null); setCompareB(null); }}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors">
              <Trans>Close</Trans>
            </button>
          </div>
          {/* Stats comparison table */}
          <div className="grid grid-cols-3 gap-2 text-sm mb-4">
            <div className="font-semibold text-gray-500 dark:text-gray-400"></div>
            <div className="font-semibold text-center text-blue-600 dark:text-blue-400">A (#{compareA! + 1})</div>
            <div className="font-semibold text-center text-green-600 dark:text-green-400">B (#{compareB! + 1})</div>
            {([
              [t`Campus Days`, 'daysOnCampus'],
              [t`Free Days`, 'freeWeekdays'],
              [t`Gaps`, 'totalGapTime'],
              [t`Commute`, 'weeklyCommute'],
              [t`Score`, 'score'],
            ] as const).map(([label, key]) => {
              const a = sorted[compareA!];
              const b = sorted[compareB!];
              const va = key === 'totalGapTime' ? formatDuration(a.totalGapTime) : key === 'weeklyCommute' ? `~${formatDuration(Math.round(a.weeklyCommute * 60))}` : a[key];
              const vb = key === 'totalGapTime' ? formatDuration(b.totalGapTime) : key === 'weeklyCommute' ? `~${formatDuration(Math.round(b.weeklyCommute * 60))}` : b[key];
              return (
                <div key={key} className="contents">
                  <div className="text-gray-600 dark:text-gray-400 py-1">{label}</div>
                  <div className="text-center py-1 dark:text-gray-200">{String(va)}</div>
                  <div className="text-center py-1 dark:text-gray-200">{String(vb)}</div>
                </div>
              );
            })}
            <div className="text-gray-600 dark:text-gray-400 py-1"><Trans>Different Groups</Trans></div>
            <div className="text-center py-1 col-span-2 text-amber-600 dark:text-amber-400">
              {(() => {
                const a = sorted[compareA!];
                const b = sorted[compareB!];
                const diffs: string[] = [];
                for (const ai of a.schedule) {
                  const bi = b.schedule.find(x => x.course.courseName === ai.course.courseName);
                  if (bi && bi.group.name !== ai.group.name) {
                    diffs.push(`${ai.course.courseName}: ${ai.group.name} → ${bi.group.name}`);
                  }
                }
                return diffs.length === 0 ? t`None` : diffs.join(', ');
              })()}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">A</div>
              <CalendarView scheduleData={sorted[compareA!]} daySettings={daySettings} dailyCommute={dailyCommute} onAddBusyPeriod={onAddBusyPeriod} onRemoveBusyPeriod={onRemoveBusyPeriod} onLockGroup={onLockGroup} courses={courses} />
            </div>
            <div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">B</div>
              <CalendarView scheduleData={sorted[compareB!]} daySettings={daySettings} dailyCommute={dailyCommute} onAddBusyPeriod={onAddBusyPeriod} onRemoveBusyPeriod={onRemoveBusyPeriod} onLockGroup={onLockGroup} courses={courses} />
            </div>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100"><Trans>Top Suggested Schedules</Trans></h2>
            {/* ICS reminder */}
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-gray-400" />
                <select value={reminderMinutes} onChange={e => setReminderMinutes(Number(e.target.value))}
                  className="text-xs border dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 dark:text-gray-300"
                  aria-label={t`ICS reminder`}>
                  <option value={0}>{t`No reminder`}</option>
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1h</option>
                </select>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-gray-500 no-print">
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono">G</span><span><Trans>Generate</Trans></span>
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono">D</span><span><Trans>Theme</Trans></span>
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono">←→</span><span><Trans>Navigate</Trans></span>
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono">P</span><span><Trans>Pin</Trans></span>
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono">Ctrl+Z/Y</span><span><Trans>Undo/Redo</Trans></span>
          </div>

          {sorted.map((res, idx) => {
            const originalIdx = schedules.indexOf(res);
            return (
              <div key={originalIdx} id={`schedule-card-${originalIdx}`} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 border ${res.pinned ? 'border-yellow-400 dark:border-yellow-600 ring-2 ring-yellow-200 dark:ring-yellow-800' : 'border-gray-100 dark:border-gray-700'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm font-bold">#{idx + 1}</span>
                    {editingLabel === originalIdx ? (
                      <input ref={labelInputRef} autoFocus type="text" defaultValue={res.label ?? ''}
                        placeholder={t`Option ${idx + 1}`}
                        className="text-lg font-bold text-gray-800 dark:text-gray-100 bg-transparent border-b-2 border-blue-400 outline-none px-1 w-40"
                        onBlur={e => { onRenameSchedule(originalIdx, e.target.value.trim()); setEditingLabel(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingLabel(null); }}
                      />
                    ) : (
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 cursor-pointer group/label flex items-center gap-1"
                        onClick={() => setEditingLabel(originalIdx)}>
                        {res.label || t`Option ${idx + 1}`}
                        <Pencil className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover/label:opacity-100 transition-opacity" />
                      </h3>
                    )}
                    {/* Pin toggle */}
                    <button onClick={() => onTogglePin(originalIdx)} title={res.pinned ? t`Unpin` : t`Pin this schedule`}
                      aria-label={res.pinned ? t`Unpin` : t`Pin this schedule`}
                      className={`p-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${res.pinned ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'}`}>
                      <Star className={`w-5 h-5 ${res.pinned ? 'fill-current' : ''}`} />
                    </button>
                    {/* ICS export */}
                    <button onClick={() => handleExportICS(res, idx)} title={t`Export as .ics`}
                      aria-label={t`Export as ICS`}
                      className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-blue-500 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500">
                      <Download className="w-5 h-5" />
                    </button>
                    {/* Compare toggle */}
                    <button onClick={() => toggleCompare(idx)}
                      title={t`Compare`} aria-label={t`Compare schedules`}
                      className={`p-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${compareA === idx || compareB === idx ? 'text-indigo-500' : 'text-gray-300 dark:text-gray-600 hover:text-indigo-400'}`}>
                      <GitCompareArrows className="w-5 h-5" />
                    </button>
                    {/* Try similar */}
                    <button onClick={() => handleTrySimilar(originalIdx, res)}
                      title={t`Find similar schedules (1-group swap)`} aria-label={t`Find similar schedules`}
                      className={`p-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${similarResults[originalIdx] ? 'text-teal-500' : 'text-gray-300 dark:text-gray-600 hover:text-teal-400'}`}>
                      <Shuffle className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-500" />
                      <span className="font-medium dark:text-gray-200"><Trans>Campus Days:</Trans> <span className="text-blue-700 dark:text-blue-400">{res.daysOnCampus}</span></span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-500" />
                      <span className="font-medium dark:text-gray-200"><Trans>Commute:</Trans> <span className="text-red-700 dark:text-red-400">~{formatDuration(Math.round(res.weeklyCommute * 60))}/{t`wk`}</span></span>
                    </div>
                    {res.totalGapTime > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Timer className="w-4 h-4 text-amber-500" />
                        <span className="font-medium dark:text-gray-200"><Trans>Gaps:</Trans> <span className="text-amber-700 dark:text-amber-400">{formatDuration(res.totalGapTime)}/{t`wk`}</span></span>
                      </div>
                    )}
                    <div className={`border px-3 py-1.5 rounded-lg flex items-center gap-2 ${res.freeWeekdays > 0 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'}`}>
                      <AlertCircle className={`w-4 h-4 ${res.freeWeekdays > 0 ? 'text-green-600' : 'text-orange-500'}`} />
                      <span className="font-medium dark:text-gray-200"><Trans>Free:</Trans> <span className={res.freeWeekdays > 0 ? 'text-green-700 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>{formatFreeDays(res)}</span></span>
                    </div>
                  </div>
                </div>
                <CalendarView scheduleData={res} daySettings={daySettings} dailyCommute={dailyCommute} onAddBusyPeriod={onAddBusyPeriod} onRemoveBusyPeriod={onRemoveBusyPeriod} onLockGroup={onLockGroup} courses={courses} />

                {/* Try Similar results */}
                {similarResults[originalIdx] && (
                  <div className="mt-4 border-t dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-3 flex items-center gap-2">
                      <Shuffle className="w-4 h-4" />
                      <Trans>Similar Schedules (1-group swap)</Trans>
                      <span className="text-xs text-gray-400">({similarResults[originalIdx].length})</span>
                    </h4>
                    {similarResults[originalIdx].length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400"><Trans>No valid neighbors found — all alternative groups conflict.</Trans></p>
                    ) : (
                      <div className="space-y-3">
                        {similarResults[originalIdx].map((sim, si) => {
                          // Find the swapped group
                          const diff = sim.schedule.find((s, i) => res.schedule[i] && s.group.name !== res.schedule[i].group.name);
                          const origItem = diff ? res.schedule.find(x => x.course.courseName === diff.course.courseName) : null;
                          return (
                            <div key={si} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium dark:text-gray-200">
                                  {diff && origItem ? (
                                    <>{diff.course.courseName}: <span className="text-red-500 line-through">{origItem.group.name}</span> → <span className="text-green-600 dark:text-green-400">{diff.group.name}</span></>
                                  ) : t`Variant ${si + 1}`}
                                </span>
                                <span className="text-xs text-gray-400">{t`Score`}: {sim.score.toFixed(0)}</span>
                              </div>
                              <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                                <span>{sim.daysOnCampus} {t`days`}</span>
                                <span>{formatDuration(sim.totalGapTime)} {t`gaps`}</span>
                                <span>~{formatDuration(Math.round(sim.weeklyCommute * 60))} {t`commute`}</span>
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
          })}
        </div>
      )}
    </>
  );
}
