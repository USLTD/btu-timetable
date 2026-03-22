import {
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  Car,
} from "lucide-preact";
import { useLocale } from "@/lib/i18n";
import * as m from "@/paraglide/messages";
import { RangeSlider } from "./range-slider";
import type {
  BusyPeriod,
  DayNumber,
  DayPref,
  DaySetting,
  DaySettings,
  MinMax,
} from "@/lib/types";
import { localizedDayName } from "../lib/constants";
import { formatTimeInput, formatClockTime } from "../lib/time";
import { cx } from "@/lib/cx";

interface SettingsPanelProps {
  dailyCommute: MinMax;
  setDailyCommute: (v: MinMax) => void;
  classesPerDay: MinMax;
  classesPerDayEnabled: boolean;
  setClassesPerDayEnabled: (v: boolean) => void;
  setClassesPerDay: (v: MinMax) => void;
  maxOverlap: number;
  maxOverlapEnabled: boolean;
  setMaxOverlapEnabled: (v: boolean) => void;
  maxDaysOnCampus: number | null;
  setMaxDaysOnCampus: (v: number | null) => void;
  setMaxOverlap: (v: number) => void;
  globalTime: MinMax;
  updateGlobalTime: (min: number, max: number) => void;
  daySettings: DaySettings;
  setDaySettings: (v: DaySettings | ((prev: DaySettings) => DaySettings)) => void;
  toggleDayPref: (dayNum: DayNumber) => void;
  updateDayTime: (dayNum: DayNumber, min: number, max: number) => void;
  updateDaySetting: (dayNum: DayNumber, patch: Partial<DaySetting>) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  enableTemplates?: boolean;
}

export function SettingsPanel({
  dailyCommute, setDailyCommute,
  classesPerDay, setClassesPerDay, classesPerDayEnabled, setClassesPerDayEnabled,
  maxOverlap, setMaxOverlap, maxOverlapEnabled, setMaxOverlapEnabled,
  maxDaysOnCampus, setMaxDaysOnCampus,
  globalTime, updateGlobalTime,
  daySettings, setDaySettings, toggleDayPref, updateDayTime, updateDaySetting,
  showAdvanced, setShowAdvanced,
  enableTemplates,
}: SettingsPanelProps) {
  const locale = useLocale();

  const applyTemplate = (prefs: Record<DayNumber, DayPref>) => {
    setDaySettings((prev) => {
      const next = { ...prev };
      for (const day of [1, 2, 3, 4, 5, 6, 7] as DayNumber[]) {
        next[day] = { ...prev[day], pref: prefs[day] ?? prev[day].pref };
      }
      return next;
    });
  };

  const resetDayPrefs = () => {
    setDaySettings((prev) => {
      const next = { ...prev };
      for (const day of [1, 2, 3, 4, 5, 6, 7] as DayNumber[]) {
        next[day] = { ...prev[day], pref: "enabled" };
      }
      return next;
    });
  };

  return (
    <div class={styles.panel}>

      {/* Main Config Grid */}
      <div class={styles.mainCard}>

        {/* Daily Commute */}
        <div class={cx(styles.section, styles.sectionWide)}>
          <div class={styles.label}>{m.daily_round_trip_commute()}</div>
          <div class={styles.row}>
            <span class={styles.valueWide}>{dailyCommute.min}h</span>
            <div class={styles.sliderWrap}>
              <RangeSlider min={dailyCommute.min} max={dailyCommute.max} minLimit={0} maxLimit={6} step={0.5} onChange={(min, max) => setDailyCommute({ min, max })} />
            </div>
            <span class={styles.valueWide}>{dailyCommute.max}h</span>
          </div>
        </div>

        {/* Classes Per Day */}
        <div class={cx(styles.section, styles.sectionWide)}>
          <div class={styles.label}>
            <label class="flex items-center gap-2 cursor-pointer w-fit" title="Toggle constraints to define required free/busy days instead">
              <input type="checkbox" checked={classesPerDayEnabled} onChange={(e) => setClassesPerDayEnabled(e.currentTarget.checked)} class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500" />
              {m.classes_per_day_min_max()}
            </label>
          </div>
          <div class={cx(styles.row, !classesPerDayEnabled && "opacity-50 pointer-events-none")}>
            <span class={styles.valueNarrow}>{classesPerDay.min}</span>
            <div class={styles.sliderWrap}>
              <RangeSlider min={classesPerDay.min} max={classesPerDay.max} minLimit={1} maxLimit={8} step={1} onChange={(min, max) => setClassesPerDay({ min, max })} />
            </div>
            <span class={styles.valueNarrow}>{classesPerDay.max}</span>
          </div>
        </div>

        {/* Max Days On Campus */}
        <div class={cx(styles.section, styles.sectionNarrow)}>
          <div class={styles.label}>
            <label class="flex items-center gap-2 cursor-pointer w-fit">
              <input type="checkbox" checked={maxDaysOnCampus !== null} onChange={(e) => setMaxDaysOnCampus(e.currentTarget.checked ? 5 : null)} class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500" />
              {m.max_days_on_campus()}
            </label>
          </div>
          <div class={cx(styles.rowTight, maxDaysOnCampus === null && "opacity-50 pointer-events-none")}>
            <input type="number" step="1" min="1" max="7" value={maxDaysOnCampus ?? 5} onChange={(e) => setMaxDaysOnCampus(Number((e.currentTarget as HTMLInputElement).value))}
              class={cx(styles.inputBase, styles.inputNarrow)} />
            <span class={styles.helper}>{m.days()}</span>
          </div>
        </div>

        {/* Max Overlap */}
        <div class={cx(styles.section, styles.sectionNarrow)}>
          <div class={styles.label}>
            <label class="flex items-center gap-2 cursor-pointer w-fit">
              <input type="checkbox" checked={maxOverlapEnabled} onChange={(e) => setMaxOverlapEnabled(e.currentTarget.checked)} class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500" />
              {m.max_overlap()}
            </label>
          </div>
          <div class={cx(styles.rowTight, !maxOverlapEnabled && "opacity-50 pointer-events-none")}>
            <input type="number" step="1" min="0" value={maxOverlap} onChange={(e) => setMaxOverlap(Number((e.currentTarget as HTMLInputElement).value))}
              class={cx(styles.inputBase, styles.inputNarrow)} />
            <span class={styles.helper}>{m.mins()}</span>
          </div>
        </div>

        {/* Global Time Range */}
        <div class={styles.sectionFull}>
          <div class={styles.sectionHeader}>
            <div class={styles.label}>{m.default_allowed_time_range_all_days()}</div>
            {/* Quick presets */}
            <div class={styles.quickPresetRow}>
              <button type="button" onClick={() => updateGlobalTime(540, globalTime.max)}
                class={styles.quickPresetBtn}
                title={m.start_from_nine()}>
                {m.from_nine().replace("9:00", formatClockTime(540, locale))}
              </button>
              <button type="button" onClick={() => updateGlobalTime(600, globalTime.max)}
                class={styles.quickPresetBtn}
                title={m.start_from_ten()}>
                {m.from_ten().replace("10:00", formatClockTime(600, locale))}
              </button>
              <button type="button" onClick={() => updateGlobalTime(globalTime.min, 1020)}
                class={styles.quickPresetBtn}
                title={m.end_by_five_pm()}>
                {m.until_five_pm().replace("17:00", formatClockTime(1020, locale))}
              </button>
              <button type="button" onClick={() => updateGlobalTime(globalTime.min, 960)}
                class={styles.quickPresetBtn}
                title={m.end_by_four_pm()}>
                {m.until_four_pm().replace("16:00", formatClockTime(960, locale))}
              </button>
              <button type="button" onClick={() => updateGlobalTime(480, 1260)}
                class={cx(styles.quickPresetBtn, styles.quickPresetDanger)}
                title={m.reset_to_full_range()}>
                {m.reset()}
              </button>
            </div>
          </div>
          <div class={styles.rangeRow}>
            <input type="time" value={formatTimeInput(globalTime.min)} onChange={(e) => { const [h, m] = (e.currentTarget as HTMLInputElement).value.split(':').map(Number); updateGlobalTime(Math.min((h * 60) + m, globalTime.max - 30), globalTime.max); }}
              class={cx(styles.inputBase, styles.inputTimeCompact)} />
            <div class={styles.rangeSliderDesktop}>
              <RangeSlider min={globalTime.min} max={globalTime.max} minLimit={480} maxLimit={1320} step={30} onChange={updateGlobalTime} />
            </div>
            <input type="time" value={formatTimeInput(globalTime.max)} onChange={(e) => { const [h, m] = (e.currentTarget as HTMLInputElement).value.split(':').map(Number); updateGlobalTime(globalTime.min, Math.max((h * 60) + m, globalTime.min + 30)); }}
              class={cx(styles.inputBase, styles.inputTimeCompact)} />
          </div>
        </div>
      </div>

      {/* Day Constraints Row */}
      <div class={styles.sectionStack}>
        <div class={styles.label}>
          {m.weekly_day_constraints_click_to_cycle()}
        </div>
        <div class={styles.dayRow}>
          {([1, 2, 3, 4, 5, 6, 7] as DayNumber[]).map((dayNum) => {
            const state = daySettings[dayNum].pref;
            const dayLabel = localizedDayName(dayNum, locale, "long");
            const prefClasses: Record<DayPref, string> = {
              enabled: styles.dayButtonEnabled,
              prioritize: styles.dayButtonPrioritize,
              disabled: styles.dayButtonDisabled,
            };
            const labels: Record<DayPref, string> = { enabled: m.enabled(), prioritize: m.prioritize_free(), disabled: m.disabled() };
            return (
              <button type="button" key={dayNum} onClick={() => toggleDayPref(dayNum)}
                aria-label={`${dayLabel}: ${labels[state]}`}
                class={cx(styles.dayButton, prefClasses[state])}>
                <div class={styles.dayShort}>{dayLabel}</div>
                <div class={styles.dayLabel}>{labels[state]}</div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={resetDayPrefs}
            aria-label={m.reset_all()}
            class={cx(styles.dayButton, styles.dayButtonReset)}
          >
            <div class={styles.dayShort}>{m.reset()}</div>
            <div class={styles.dayLabel}>{m.reset_all()}</div>
          </button>
        </div>
      </div>

      {enableTemplates && (
        <div class={styles.sectionStack}>
          <div class={styles.label}>
            {m.week_templates()}
          </div>
          <div class={styles.templateRow}>
            <button type="button"
              onClick={() =>
                applyTemplate({
                  1: "enabled",
                  2: "enabled",
                  3: "enabled",
                  4: "enabled",
                  5: "enabled",
                  6: "disabled",
                  7: "disabled",
                })
              }
              class={styles.templateButton}
            >
              {m.weekdays_only()}
            </button>
            <button type="button"
              onClick={() =>
                applyTemplate({
                  1: "enabled",
                  2: "enabled",
                  3: "enabled",
                  4: "enabled",
                  5: "prioritize",
                  6: "disabled",
                  7: "disabled",
                })
              }
              class={styles.templateButton}
            >
              {m.prefer_free_friday()}
            </button>
            <button type="button"
              onClick={() =>
                applyTemplate({
                  1: "enabled",
                  2: "enabled",
                  3: "enabled",
                  4: "enabled",
                  5: "enabled",
                  6: "enabled",
                  7: "enabled",
                })
              }
              class={styles.templateButton}
            >
              {m.all_days_enabled()}
            </button>
          </div>
        </div>
      )}

      {/* Advanced Per-Day Settings */}
      <div class={styles.card}>
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          class={styles.cardHeader} aria-expanded={showAdvanced} aria-controls="advanced-settings">
          <div class={styles.cardTitle}>
            <Settings class={styles.cardIcon} />
            {m.advanced_per_day_settings()}
          </div>
          {showAdvanced ? <ChevronUp class={styles.chevron} /> : <ChevronDown class={styles.chevron} />}
        </button>
        {showAdvanced && (
          <div id="advanced-settings" class={styles.cardBodyLarge}>
            <p class={styles.cardNote}>
              {m.day_settings_advanced_hint()}
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
                <div key={dayNum} class={styles.dayCard}>
                  <div class={styles.dayHeader}>
                    <div class={styles.dayName}>{dayName}</div>
                    <div class={styles.dayRangeRow}>
                      <input type="time" value={formatTimeInput(ds.min)} onChange={(e) => { const [h, m] = (e.currentTarget as HTMLInputElement).value.split(':').map(Number); updateDayTime(dayNum, Math.min((h * 60) + m, ds.max - 30), ds.max); }}
                        class={cx(styles.inputBase, styles.inputTime)} />
                      <div class={styles.rangeSliderMd}>
                        <RangeSlider min={ds.min} max={ds.max} minLimit={480} maxLimit={1320} step={30} onChange={(min, max) => updateDayTime(dayNum, min, max)} />
                      </div>
                      <input type="time" value={formatTimeInput(ds.max)} onChange={(e) => { const [h, m] = (e.currentTarget as HTMLInputElement).value.split(':').map(Number); updateDayTime(dayNum, ds.min, Math.max((h * 60) + m, ds.min + 30)); }}
                        class={cx(styles.inputBase, styles.inputTime)} />
                    </div>
                  </div>

                  {/* Per-day commuting and gaps */}
                  <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div class={styles.commuteRow} style={{ paddingLeft: 0 }}>
                      <Car class={styles.commuteIcon} />
                      <span class={styles.commuteLabel}>{m.commute_colon()}</span>
                      <input
                        type="number" step="0.5" min="0" max="12"
                        value={ds.commute ?? ''}
                        placeholder={`${((dailyCommute.min + dailyCommute.max) / 2).toFixed(1)}`}
                        onChange={(e) => {
                          const v = (e.currentTarget as HTMLInputElement).value;
                          updateDaySetting(dayNum, { commute: v === '' ? undefined : Number(v) });
                        }}
                        class={cx(styles.inputBase, styles.inputTiny, styles.inputNarrow)}
                      />
                      <span class={styles.commuteUnit}>h</span>
                      {ds.commute != null && (
                        <button type="button" onClick={() => updateDaySetting(dayNum, { commute: undefined })}
                          class={styles.resetCommute} title={m.reset_to_default()} aria-label={`Reset commute for ${dayName}`}>
                          <X class={styles.smallIcon} />
                        </button>
                      )}
                    </div>

                    <div class={styles.commuteRow} style={{ paddingLeft: 0 }}>
                      <span class={styles.commuteLabel}>{m.max_gaps_per_day()}:</span>
                      <input
                        type="number" step="0.5" min="0" max="12"
                        value={ds.maxGaps ?? ''}
                        placeholder="∞"
                        onChange={(e) => {
                          const v = (e.currentTarget as HTMLInputElement).value;
                          updateDaySetting(dayNum, { maxGaps: v === '' ? null : Number(v) });
                        }}
                        class={cx(styles.inputBase, styles.inputTiny, styles.inputNarrow)}
                      />
                      <span class={styles.commuteUnit}>h</span>
                    </div>
                  </div>

                  {/* Busy periods */}
                  <div class={styles.busyList}>
                    {busyPeriods.map((bp, bpIdx) => (
                      <div key={`${bp.start}-${bp.end}`} class={styles.busyRow}>
                        <span class={styles.busyLabel}>{m.busy_colon()}</span>
                        <input type="time" value={formatTimeInput(bp.start)}
                          onChange={(e) => { const [h, m] = (e.currentTarget as HTMLInputElement).value.split(':').map(Number); updateBusyPeriod(bpIdx, 'start', h * 60 + m); }}
                          class={cx(styles.inputBase, styles.inputTiny, styles.inputTimeSmall)} />
                        <span class={styles.busyDash}>–</span>
                        <input type="time" value={formatTimeInput(bp.end)}
                          onChange={(e) => { const [h, m] = (e.currentTarget as HTMLInputElement).value.split(':').map(Number); updateBusyPeriod(bpIdx, 'end', h * 60 + m); }}
                          class={cx(styles.inputBase, styles.inputTiny, styles.inputTimeSmall)} />
                        <button type="button" onClick={() => removeBusyPeriod(bpIdx)}
                          class={styles.removeBusy} aria-label={`Remove busy period ${bpIdx + 1} for ${dayName}`}>
                          <Trash2 class={styles.smallIcon} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addBusyPeriod}
                      class={styles.addLink} aria-label={`Add busy period for ${dayName}`}>
                      <Plus class={styles.smallIcon} />
                      {m.add_busy_period()}
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

const styles = {
  panel: "mb-6 flex flex-col gap-6",
  mainCard:
    "bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-5 flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-3 dark:bg-gray-800/50 dark:border-gray-700",
  section: "flex flex-col gap-1.5 flex-1 min-w-0",
  sectionWide: "sm:flex-[2_1_18rem]",
  sectionNarrow: "sm:flex-[1_1_10rem]",
  sectionFull: "basis-full pt-2 border-t border-gray-200 space-y-1.5 dark:border-gray-700",
  sectionHeader: "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-1",
  label: "text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200",
  row: "grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap sm:gap-3",
  rowTight: "flex items-center gap-2",
  valueWide: "w-9 text-right text-xs sm:w-10 sm:text-sm font-bold text-gray-700 dark:text-gray-300",
  valueNarrow: "w-4 text-right text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300",
  sliderWrap: "flex-1 px-1 sm:px-2",
  helper: "text-sm text-gray-600 dark:text-gray-300",
  inputBase:
    "border border-gray-200 rounded-md px-2 py-1 text-xs sm:text-sm bg-white text-gray-800 shadow-sm outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
  inputNarrow: "w-14 sm:w-16",
  inputTimeCompact: "w-full min-w-[6.5rem] sm:w-28 sm:min-w-0",
  quickPresetRow: "flex flex-wrap gap-1 text-xs",
  quickPresetBtn:
    "px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600 transition-colors cursor-pointer hover:bg-blue-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-blue-900/30",
  quickPresetDanger: "hover:bg-red-100 dark:hover:bg-red-900/30",
  rangeRow: "grid grid-cols-2 gap-2 sm:grid-cols-[minmax(6rem,auto)_1fr_minmax(6rem,auto)] sm:items-center sm:gap-3",
  rangeSliderDesktop: "hidden sm:block sm:px-2",
  sectionStack: "flex flex-col gap-2",
  dayRow:
    "grid grid-cols-2 sm:flex rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden w-full",
  dayButton:
    "flex-1 py-2 px-1 text-center text-sm border-r last:border-r-0 border-b-4 border-r-gray-200 dark:border-r-gray-700 transition-all",
  dayButtonEnabled:
    "bg-green-50 text-green-700 hover:bg-green-100 border-green-500 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600",
  dayButtonPrioritize:
    "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600",
  dayButtonDisabled:
    "bg-red-50 text-red-700 opacity-90 hover:bg-red-100 border-red-500 dark:bg-red-900/30 dark:text-red-400 dark:border-red-600",
  dayButtonReset:
    "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600",
  dayShort: "font-semibold text-[11px] sm:text-xs",
  dayLabel: "text-[10px] uppercase tracking-[0.08em] mt-0.5",
  templateRow:
    "inline-flex w-fit max-w-full flex-wrap rounded-lg border border-gray-200 overflow-hidden bg-gray-50 dark:border-gray-700 dark:bg-gray-800",
  templateButton:
    "px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors cursor-pointer hover:bg-blue-100 border-r border-gray-200 last:border-r-0 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-blue-900/30",
  card: "border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800",
  cardHeader:
    "w-full px-4 py-3 bg-gray-50 flex justify-between items-center transition-colors cursor-pointer hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700",
  cardTitle: "flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200",
  cardIcon: "w-4 h-4",
  cardBadge: "text-xs px-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  chevron: "w-5 h-5 text-gray-600 dark:text-gray-300",
  cardBody: "p-4 border-t border-gray-200 space-y-2 dark:border-gray-700",
  cardBodyLarge: "p-4 border-t border-gray-200 space-y-5 dark:border-gray-700",
  cardNote: "text-xs text-gray-600 pb-2 border-b border-gray-200 dark:text-gray-300 dark:border-gray-700",
  lecturerList: "flex flex-wrap gap-2",
  lecturerButton:
    "border border-gray-200 rounded-full px-2 py-1 text-xs flex flex-col items-start gap-0.5 transition-colors",
  lecturerPrefer:
    "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  lecturerAvoid:
    "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  lecturerNeutral: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
  lecturerName: "flex items-center gap-1",
  lecturerIcon: "w-3 h-3",
  lecturerIconFilled: "w-3 h-3 fill-current",
  ratingRow: "flex items-center text-xs opacity-80 gap-1",
  ratingStars: "text-current",
  ratingStar: "w-3 h-3",
  dayCard: "border border-gray-100 rounded-lg p-3 space-y-3 dark:border-gray-700",
  dayHeader: "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3",
  dayName: "w-24 font-medium text-sm text-gray-700 shrink-0 dark:text-gray-300",
  dayRangeRow: "flex-1 flex flex-wrap items-center max-w-[30rem] gap-2 sm:gap-3",
  inputTime: "w-[45%] flex-1 min-w-[6rem] sm:w-28 sm:flex-none",
  rangeSliderMd: "flex-1 hidden px-2 md:block",
  commuteRow: "flex items-center gap-2 sm:pl-[6.75rem] flex-wrap",
  commuteIcon: "w-4 h-4 text-gray-500 shrink-0 dark:text-gray-300",
  commuteLabel: "text-xs text-gray-600 shrink-0 dark:text-gray-300",
  inputTiny: "px-2 py-0.5 text-xs w-16",
  commuteUnit: "text-xs text-gray-600 dark:text-gray-300",
  resetCommute: "p-2 text-gray-400 transition-colors cursor-pointer hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center",
  smallIcon: "w-3 h-3",
  busyList: "space-y-1.5 sm:pl-[6.75rem]",
  busyRow: "flex flex-wrap items-center gap-2",
  busyLabel: "w-10 shrink-0 text-xs text-gray-600 dark:text-gray-300",
  inputTimeSmall: "w-[40%] flex-1 min-w-[5.5rem] sm:w-24 sm:flex-none",
  busyDash: "text-xs text-gray-600",
  removeBusy: "p-2 text-gray-400 transition-colors cursor-pointer hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center",
  addLink:
    "flex items-center gap-1 text-xs text-blue-600 transition-colors cursor-pointer hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
};

