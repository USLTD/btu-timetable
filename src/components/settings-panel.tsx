import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Star, X, Plus, Trash2, Car } from 'lucide-react';
import { Trans, useLingui } from '@lingui/react/macro';
import { RangeSlider } from './range-slider.tsx';
import type { BusyPeriod, Course, DayNumber, DayPref, DaySetting, DaySettings, LecturerPref, LecturerWeight, MinMax } from '../types.ts';
import { localizedDayName } from '../lib/constants.ts';
import { formatTime } from '../lib/time.ts';

interface SettingsPanelProps {
  dailyCommute: MinMax;
  setDailyCommute: (v: MinMax) => void;
  classesPerDay: MinMax;
  setClassesPerDay: (v: MinMax) => void;
  maxOverlap: number;
  setMaxOverlap: (v: number) => void;
  globalTime: MinMax;
  updateGlobalTime: (min: number, max: number) => void;
  daySettings: DaySettings;
  toggleDayPref: (dayNum: DayNumber) => void;
  updateDayTime: (dayNum: DayNumber, min: number, max: number) => void;
  updateDaySetting: (dayNum: DayNumber, patch: Partial<DaySetting>) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  courses: Course[];
  lecturerPrefs: LecturerPref[];
  setLecturerPrefs: (v: LecturerPref[]) => void;
}

export function SettingsPanel({
  dailyCommute, setDailyCommute,
  classesPerDay, setClassesPerDay,
  maxOverlap, setMaxOverlap,
  globalTime, updateGlobalTime,
  daySettings, toggleDayPref, updateDayTime, updateDaySetting,
  showAdvanced, setShowAdvanced,
  courses, lecturerPrefs, setLecturerPrefs,
}: SettingsPanelProps) {
  const [showLecturers, setShowLecturers] = useState(false);
  const { t, i18n } = useLingui();
  const locale = i18n.locale;

  // Collect unique lecturers from loaded courses
  const allLecturers = [...new Set(courses.flatMap(c => c.groups.map(g => g.lecturer)))].filter(Boolean).sort();

  const getLecturerWeight = (name: string): LecturerWeight => {
    return lecturerPrefs.find(p => p.lecturer === name)?.weight ?? 'neutral';
  };

  const cycleLecturerPref = (name: string) => {
    const current = getLecturerWeight(name);
    const order: LecturerWeight[] = ['neutral', 'prefer', 'avoid'];
    const next = order[(order.indexOf(current) + 1) % 3];
    const filtered = lecturerPrefs.filter(p => p.lecturer !== name);
    if (next !== 'neutral') filtered.push({ lecturer: name, weight: next });
    setLecturerPrefs(filtered);
  };

  return (
    <div className="mb-6 flex flex-col gap-6">

      {/* Main Config Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg border border-gray-200 dark:border-gray-700">

        {/* Daily Commute */}
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200"><Trans>Daily Round-Trip Commute</Trans></label>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold w-10 text-right dark:text-gray-300">{dailyCommute.min}h</span>
            <div className="flex-1 px-2">
              <RangeSlider min={dailyCommute.min} max={dailyCommute.max} minLimit={0} maxLimit={6} step={0.5} onChange={(min, max) => setDailyCommute({ min, max })} />
            </div>
            <span className="text-sm font-bold w-10 dark:text-gray-300">{dailyCommute.max}h</span>
          </div>
        </div>

        {/* Classes Per Day */}
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200"><Trans>Classes Per Day (Min - Max)</Trans></label>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold w-4 text-right dark:text-gray-300">{classesPerDay.min}</span>
            <div className="flex-1 px-2">
              <RangeSlider min={classesPerDay.min} max={classesPerDay.max} minLimit={1} maxLimit={8} step={1} onChange={(min, max) => setClassesPerDay({ min, max })} />
            </div>
            <span className="text-sm font-bold w-4 dark:text-gray-300">{classesPerDay.max}</span>
          </div>
        </div>

        {/* Max Overlap */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200"><Trans>Max Overlap</Trans></label>
          <div className="flex items-center gap-2">
            <input type="number" step="1" min="0" value={maxOverlap} onChange={(e) => setMaxOverlap(Number(e.target.value))}
              className="w-16 border dark:border-gray-600 rounded px-2 py-1 text-sm shadow-sm outline-none bg-white dark:bg-gray-800 dark:text-gray-200" />
            <span className="text-sm text-gray-500 dark:text-gray-400"><Trans>mins</Trans></span>
          </div>
        </div>

        {/* Global Time Range */}
        <div className="flex flex-col gap-1.5 lg:col-span-5 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200"><Trans>Default Allowed Time Range (All Days)</Trans></label>
            {/* Quick presets */}
            <div className="flex items-center gap-1 text-xs flex-wrap">
              <button onClick={() => updateGlobalTime(540, globalTime.max)}
                className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                title={t`Start from 9:00`}>
                <Trans>From 9:00</Trans>
              </button>
              <button onClick={() => updateGlobalTime(600, globalTime.max)}
                className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                title={t`Start from 10:00`}>
                <Trans>From 10:00</Trans>
              </button>
              <button onClick={() => updateGlobalTime(globalTime.min, 1020)}
                className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                title={t`End by 17:00`}>
                <Trans>Until 17:00</Trans>
              </button>
              <button onClick={() => updateGlobalTime(globalTime.min, 960)}
                className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                title={t`End by 16:00`}>
                <Trans>Until 16:00</Trans>
              </button>
              <button onClick={() => updateGlobalTime(480, 1260)}
                className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                title={t`Reset to full range`}>
                <Trans>Reset</Trans>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 max-w-2xl">
            <input type="time" value={formatTime(globalTime.min)} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); updateGlobalTime(Math.min((h * 60) + m, globalTime.max - 30), globalTime.max); }}
              className="border dark:border-gray-600 rounded px-2 py-1 text-sm shadow-sm bg-white dark:bg-gray-800 dark:text-gray-200" />
            <div className="flex-1 hidden sm:block px-2">
              <RangeSlider min={globalTime.min} max={globalTime.max} minLimit={480} maxLimit={1320} step={30} onChange={updateGlobalTime} />
            </div>
            <input type="time" value={formatTime(globalTime.max)} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); updateGlobalTime(globalTime.min, Math.max((h * 60) + m, globalTime.min + 30)); }}
              className="border dark:border-gray-600 rounded px-2 py-1 text-sm shadow-sm bg-white dark:bg-gray-800 dark:text-gray-200" />
          </div>
        </div>
      </div>

      {/* Day Constraints Row */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Trans>Weekly Day Constraints (Click to cycle)</Trans>
        </label>
        <div className="grid grid-cols-4 sm:flex rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
          {([1, 2, 3, 4, 5, 6, 7] as DayNumber[]).map((dayNum) => {
            const state = daySettings[dayNum].pref;
            const shortName = localizedDayName(dayNum, locale, 'short');
            const styles: Record<DayPref, string> = {
              enabled: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 border-green-500',
              prioritize: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 border-blue-500',
              disabled: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 border-red-500 opacity-90',
            };
            const labels: Record<DayPref, string> = { enabled: t`Enabled`, prioritize: t`Prioritize Free`, disabled: t`Disabled` };
            return (
              <button key={dayNum} onClick={() => toggleDayPref(dayNum)}
                aria-label={`${shortName}: ${labels[state]}`}
                className={`flex-1 py-2 px-1 text-center text-sm border-r last:border-r-0 border-b-4 border-r-gray-200 dark:border-r-gray-700 transition-all ${styles[state]}`}>
                <div className="font-bold">{shortName}</div>
                <div className="text-[10px] uppercase tracking-wide mt-0.5">{labels[state]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructor Preferences (Feature 6) */}
      {allLecturers.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden bg-white dark:bg-gray-800">
          <button onClick={() => setShowLecturers(!showLecturers)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <Star className="w-4 h-4" />
              <Trans>Lecturer Preferences</Trans>
              {lecturerPrefs.length > 0 && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 rounded-full">{lecturerPrefs.length}</span>}
            </div>
            {showLecturers ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </button>
          {showLecturers && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 pb-2 border-b dark:border-gray-700"><Trans>Click to cycle: Neutral → Prefer → Avoid</Trans></p>
              <div className="flex flex-wrap gap-2">
                {allLecturers.map(name => {
                  const weight = getLecturerWeight(name);
                  const cls = weight === 'prefer'
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                    : weight === 'avoid'
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600';
                  const icon = weight === 'prefer' ? <Star className="w-3 h-3 fill-current" /> : weight === 'avoid' ? <X className="w-3 h-3" /> : null;
                  return (
                    <button key={name} onClick={() => cycleLecturerPref(name)}
                      className={`border px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${cls}`}>
                      {icon} {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Per-Day Settings */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden bg-white dark:bg-gray-800">
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Settings className="w-4 h-4" />
            <Trans>Advanced Per-Day Settings</Trans>
          </div>
          {showAdvanced ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {showAdvanced && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 pb-2 border-b dark:border-gray-700">
              <Trans>Override time bounds, set commute, and mark busy periods for each day.</Trans>
            </p>
            {([1, 2, 3, 4, 5, 6, 7] as DayNumber[]).map((dayNum) => {
              const ds = daySettings[dayNum];
              if (ds.pref === 'disabled') return null;
              const dayName = localizedDayName(dayNum, locale);
              const busyPeriods = ds.busyPeriods ?? [];

              const addBusyPeriod = () => {
                const newBp: BusyPeriod = { start: 780, end: 840 }; // default 1 PM - 2 PM
                updateDaySetting(dayNum, { busyPeriods: [...busyPeriods, newBp] });
              };
              const removeBusyPeriod = (idx: number) => {
                updateDaySetting(dayNum, { busyPeriods: busyPeriods.filter((_, i) => i !== idx) });
              };
              const updateBusyPeriod = (idx: number, field: 'start' | 'end', value: number) => {
                const candidate = { ...busyPeriods[idx], [field]: value };
                // Ensure start < end
                if (candidate.start >= candidate.end) return;
                // Prevent overlap with other busy periods (touching is OK)
                const others = busyPeriods.filter((_, i) => i !== idx);
                const overlaps = others.some(e => candidate.start < e.end && e.start < candidate.end);
                if (overlaps) return;
                const updated = busyPeriods.map((bp, i) => i === idx ? candidate : bp);
                updateDaySetting(dayNum, { busyPeriods: updated.sort((a, b) => a.start - b.start) });
              };

              return (
                <div key={dayNum} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-24 font-medium text-sm text-gray-700 dark:text-gray-300 shrink-0">{dayName}</div>
                    <div className="flex-1 flex items-center gap-3 max-w-xl">
                      <input type="time" value={formatTime(ds.min)} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); updateDayTime(dayNum, Math.min((h * 60) + m, ds.max - 30), ds.max); }}
                        className="border dark:border-gray-600 rounded px-2 py-1 text-sm shadow-sm w-28 bg-white dark:bg-gray-800 dark:text-gray-200" />
                      <div className="flex-1 hidden md:block px-2">
                        <RangeSlider min={ds.min} max={ds.max} minLimit={480} maxLimit={1320} step={30} onChange={(min, max) => updateDayTime(dayNum, min, max)} />
                      </div>
                      <input type="time" value={formatTime(ds.max)} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); updateDayTime(dayNum, ds.min, Math.max((h * 60) + m, ds.min + 30)); }}
                        className="border dark:border-gray-600 rounded px-2 py-1 text-sm shadow-sm w-28 bg-white dark:bg-gray-800 dark:text-gray-200" />
                    </div>
                  </div>

                  {/* Per-day commute */}
                  <div className="flex items-center gap-2 pl-0 sm:pl-27">
                    <Car className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                    <label className="text-xs text-gray-500 dark:text-gray-400 shrink-0"><Trans>Commute:</Trans></label>
                    <input
                      type="number" step="0.5" min="0" max="12"
                      value={ds.commute ?? ''}
                      placeholder={`${((dailyCommute.min + dailyCommute.max) / 2).toFixed(1)}`}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateDaySetting(dayNum, { commute: v === '' ? undefined : Number(v) });
                      }}
                      className="w-16 border dark:border-gray-600 rounded px-2 py-0.5 text-xs shadow-sm bg-white dark:bg-gray-800 dark:text-gray-200"
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500">h</span>
                    {ds.commute != null && (
                      <button onClick={() => updateDaySetting(dayNum, { commute: undefined })}
                        className="text-gray-400 hover:text-red-500 transition-colors" title={t`Reset to default`}>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Busy periods */}
                  <div className="pl-0 sm:pl-27 space-y-1.5">
                    {busyPeriods.map((bp, bpIdx) => (
                      <div key={bpIdx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-10 shrink-0"><Trans>Busy:</Trans></span>
                        <input type="time" value={formatTime(bp.start)}
                          onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); updateBusyPeriod(bpIdx, 'start', h * 60 + m); }}
                          className="border dark:border-gray-600 rounded px-1.5 py-0.5 text-xs shadow-sm w-24 bg-white dark:bg-gray-800 dark:text-gray-200" />
                        <span className="text-xs text-gray-400">–</span>
                        <input type="time" value={formatTime(bp.end)}
                          onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); updateBusyPeriod(bpIdx, 'end', h * 60 + m); }}
                          className="border dark:border-gray-600 rounded px-1.5 py-0.5 text-xs shadow-sm w-24 bg-white dark:bg-gray-800 dark:text-gray-200" />
                        <button onClick={() => removeBusyPeriod(bpIdx)}
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addBusyPeriod}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      <Trans>Add busy period</Trans>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
