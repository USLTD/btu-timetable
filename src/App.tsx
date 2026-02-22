import { useState, useCallback, useEffect } from 'react';
import { Calendar as CalendarIcon, Sun, Moon, Monitor, Download, Share2, Import, Copy, Check } from 'lucide-react';
import { Trans, useLingui } from '@lingui/react/macro';
import { usePwaInstall } from './lib/use-pwa-install.ts';
import { encodeState, importHash, shareToUrl } from './lib/url-state.ts';
import type { Course, DayNumber, DayPref, DaySetting, DaySettings, InstructorPref, MinMax, RejectionReason, ScoredSchedule } from './types.ts';
import { parseFiles } from './lib/parsers.ts';
import { usePersistedState } from './lib/storage.ts';
import { useTheme } from './lib/use-theme.ts';
import { useSchedulerWorker } from './lib/use-scheduler-worker.ts';
import { locales, loadCatalog, type Locale } from './i18n.ts';
import { SettingsPanel } from './components/settings-panel.tsx';
import { FileUpload } from './components/file-upload.tsx';
import { CourseList } from './components/course-list.tsx';
import { ScheduleResults } from './components/schedule-results.tsx';
const DEFAULT_DAY_SETTING = { min: 480, max: 1260 };
const INITIAL_DAY_SETTINGS: DaySettings = {
  1: { pref: 'enabled', ...DEFAULT_DAY_SETTING },
  2: { pref: 'enabled', ...DEFAULT_DAY_SETTING },
  3: { pref: 'enabled', ...DEFAULT_DAY_SETTING },
  4: { pref: 'enabled', ...DEFAULT_DAY_SETTING },
  5: { pref: 'enabled', ...DEFAULT_DAY_SETTING },
  6: { pref: 'enabled', ...DEFAULT_DAY_SETTING },
  7: { pref: 'enabled', ...DEFAULT_DAY_SETTING },
};
export default function App() {
  const [courses, setCourses] = usePersistedState<Course[]>('app-courses', []);
  const [schedules, setSchedules] = usePersistedState<ScoredSchedule[]>('app-schedules', []);
  const [dailyCommute, setDailyCommute] = usePersistedState<MinMax>('app-commute', { min: 1.0, max: 2.5 });
  const [classesPerDay, setClassesPerDay] = usePersistedState<MinMax>('app-classes-per-day', { min: 1, max: 5 });
  const [maxOverlap, setMaxOverlap] = usePersistedState<number>('app-max-overlap', 5);
  const [globalTime, setGlobalTime] = usePersistedState<MinMax>('app-global-time', { min: 480, max: 1260 });
  const [daySettings, setDaySettings] = usePersistedState<DaySettings>('app-day-settings', INITIAL_DAY_SETTINGS);
  const [instructorPrefs, setInstructorPrefs] = usePersistedState<InstructorPref[]>('app-instructor-prefs', []);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [limitWarning, setLimitWarning] = useState(false);
  const [rejections, setRejections] = useState<RejectionReason[]>([]);
  const [whatIfExclusions, setWhatIfExclusions] = useState<Set<string>>(new Set());
  const [focusedSchedule, setFocusedSchedule] = useState(0);
  const maxResults = 20;
  const { theme, cycleTheme } = useTheme();
  const themeIcon = theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />;
  const { canInstall, install } = usePwaInstall();
  const scheduler = useSchedulerWorker();
  const toggleDayPref = useCallback((dayNum: DayNumber) => {
    setDaySettings((prev: DaySettings) => {
      const states: DayPref[] = ['enabled', 'prioritize', 'disabled'];
      const current = prev[dayNum].pref;
      const next = states[(states.indexOf(current) + 1) % 3];
      return { ...prev, [dayNum]: { ...prev[dayNum], pref: next } };
    });
  }, [setDaySettings]);
  const updateGlobalTime = useCallback((min: number, max: number) => {
    setGlobalTime({ min, max });
    setDaySettings((prev: DaySettings) => {
      const next = { ...prev };
      for (let i = 1; i <= 7; i++) next[i as DayNumber] = { ...next[i as DayNumber], min, max };
      return next;
    });
  }, [setGlobalTime, setDaySettings]);
  const updateDayTime = useCallback((dayNum: DayNumber, min: number, max: number) => {
    setDaySettings((prev: DaySettings) => ({ ...prev, [dayNum]: { ...prev[dayNum], min, max } }));
  }, [setDaySettings]);
  const updateDaySetting = useCallback((dayNum: DayNumber, patch: Partial<DaySetting>) => {
    setDaySettings((prev: DaySettings) => ({ ...prev, [dayNum]: { ...prev[dayNum], ...patch } }));
  }, [setDaySettings]);
  const handleFiles = async (files: FileList) => {
    setCourses(await parseFiles(files, courses));
  };
  const toggleCourse = (index: number) => {
    const updated = [...courses];
    updated[index] = { ...updated[index], isActive: !updated[index].isActive };
    setCourses(updated);
  };
  const handleLockGroup = (courseIdx: number, groupName: string | undefined) => {
    const updated = [...courses];
    updated[courseIdx] = { ...updated[courseIdx], lockedGroup: groupName };
    setCourses(updated);
  };
  const handleReorder = (reordered: Course[]) => {
    setCourses(reordered);
  };
  const handleTogglePin = (idx: number) => {
    const updated = [...schedules];
    updated[idx] = { ...updated[idx], pinned: !updated[idx].pinned };
    setSchedules(updated);
  };
  const handleGenerate = async () => {
    setLoading(true);
    setHasSearched(true);
    setLimitWarning(false);
    setRejections([]);
    try {
      // What-if: filter out excluded courses for this run
      const effectiveCourses = whatIfExclusions.size > 0
        ? courses.map(c => whatIfExclusions.has(c.courseName) ? { ...c, isActive: false } : c)
        : courses;
      const result = await scheduler.run(effectiveCourses, {
        daySettings, classesPerDay, maxOverlap, dailyCommute, maxResults, instructorPrefs,
      });
      setSchedules(result.schedules);
      setLimitWarning(result.limitReached);
      setRejections(result.rejections);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };
  const handleClear = () => { setCourses([]); setSchedules([]); setRejections([]); setWhatIfExclusions(new Set()); };

  const toggleWhatIf = useCallback((courseName: string) => {
    setWhatIfExclusions(prev => {
      const next = new Set(prev);
      if (next.has(courseName)) next.delete(courseName);
      else next.add(courseName);
      return next;
    });
  }, []);

  const [currentLocale, setCurrentLocale] = usePersistedState<Locale>('app-locale', 'en');
  const { t } = useLingui();

  const switchLocale = async (locale: Locale) => {
    await loadCatalog(locale);
    setCurrentLocale(locale);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when inside inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleGenerate();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        cycleTheme();
      } else if (e.key === 'ArrowRight' && schedules.length > 0) {
        e.preventDefault();
        setFocusedSchedule(prev => Math.min(prev + 1, schedules.length - 1));
        // Scroll to focused schedule card
        document.getElementById(`schedule-card-${Math.min(focusedSchedule + 1, schedules.length - 1)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (e.key === 'ArrowLeft' && schedules.length > 0) {
        e.preventDefault();
        setFocusedSchedule(prev => Math.max(prev - 1, 0));
        document.getElementById(`schedule-card-${Math.max(focusedSchedule - 1, 0)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if ((e.key === 'p' || e.key === 'P') && schedules.length > 0) {
        e.preventDefault();
        handleTogglePin(focusedSchedule);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const addBusyPeriod = useCallback((dayNum: DayNumber, bp: { start: number; end: number }) => {
    setDaySettings((prev: DaySettings) => {
      const ds = prev[dayNum];
      const existing = ds.busyPeriods ?? [];
      // Prevent overlap (touching is OK: bp.start === e.end)
      const overlaps = existing.some(e => bp.start < e.end && e.start < bp.end);
      if (overlaps) return prev;
      return { ...prev, [dayNum]: { ...ds, busyPeriods: [...existing, bp].sort((a, b) => a.start - b.start) } };
    });
  }, [setDaySettings]);

  const removeBusyPeriod = useCallback((dayNum: DayNumber, bpIdx: number) => {
    setDaySettings((prev: DaySettings) => {
      const ds = prev[dayNum];
      const bps = (ds.busyPeriods ?? []).filter((_, i) => i !== bpIdx);
      return { ...prev, [dayNum]: { ...ds, busyPeriods: bps } };
    });
  }, [setDaySettings]);

  // --- URL sharing ---
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportHash, setExportHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const buildShareableState = useCallback(() => ({
    courses, daySettings, globalTime, classesPerDay, maxOverlap, dailyCommute, instructorPrefs,
  }), [courses, daySettings, globalTime, classesPerDay, maxOverlap, dailyCommute, instructorPrefs]);

  const handleShare = useCallback(() => {
    shareToUrl(buildShareableState());
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }, [buildShareableState]);

  const handleExportHash = useCallback(() => {
    const hash = encodeState(buildShareableState());
    setExportHash(hash);
    setShowImport(false);
  }, [buildShareableState]);

  const handleImport = useCallback(() => {
    if (!importText.trim()) return;
    const ok = importHash(importText.trim());
    if (ok) {
      setImportText('');
      setShowImport(false);
      setExportHash('');
      // Clear transient state
      setSchedules([]);
      setRejections([]);
      setWhatIfExclusions(new Set());
      setHasSearched(false);
    }
  }, [importText, setSchedules]);

  const copyExportHash = useCallback(() => {
    navigator.clipboard.writeText(exportHash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { });
  }, [exportHash]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8 font-sans transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              <Trans>Ultimate Schedule Optimizer</Trans>
            </h1>
            <div className="flex items-center gap-1">
              {/* Locale switcher */}
              <select
                value={currentLocale}
                onChange={e => switchLocale(e.target.value as Locale)}
                className="text-sm border dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
                title={t`Language`}
              >
                {Object.entries(locales).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              {canInstall && (
                <button onClick={install} title={t`Install App`}
                  className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="w-5 h-5" />
                </button>
              )}
              <button onClick={handleShare} title={shared ? t`Link copied!` : t`Share (copy URL)`}
                className={`p-2 rounded-lg transition-colors ${shared ? 'text-green-500' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {shared ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              </button>
              <button onClick={cycleTheme} title={t`Theme: ${theme}`}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                {themeIcon}
              </button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            <Trans>Upload course files, dial in your precise constraints, and find your perfect week.</Trans>
          </p>
          <SettingsPanel
            dailyCommute={dailyCommute} setDailyCommute={setDailyCommute}
            classesPerDay={classesPerDay} setClassesPerDay={setClassesPerDay}
            maxOverlap={maxOverlap} setMaxOverlap={setMaxOverlap}
            globalTime={globalTime} updateGlobalTime={updateGlobalTime}
            daySettings={daySettings} toggleDayPref={toggleDayPref} updateDayTime={updateDayTime} updateDaySetting={updateDaySetting}
            showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced}
            courses={courses} instructorPrefs={instructorPrefs} setInstructorPrefs={setInstructorPrefs}
          />
          {/* Import / Export hash controls */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onClick={() => { setShowImport(!showImport); setExportHash(''); }}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <Import className="w-4 h-4" />
              <Trans>Import Hash</Trans>
            </button>
            <button onClick={handleExportHash}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <Copy className="w-4 h-4" />
              <Trans>Export Hash</Trans>
            </button>
          </div>
          {showImport && (
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text" value={importText} onChange={e => setImportText(e.target.value)}
                placeholder={t`Paste shared hash here…`}
                className="flex-1 border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 shadow-sm"
              />
              <button onClick={handleImport}
                disabled={!importText.trim()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Trans>Apply</Trans>
              </button>
            </div>
          )}
          {exportHash && (
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text" readOnly value={exportHash}
                onClick={copyExportHash}
                className="flex-1 border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 shadow-sm cursor-pointer select-all font-mono text-xs"
                title={t`Click to copy`}
              />
              <span className={`text-xs transition-opacity ${copied ? 'text-green-500 opacity-100' : 'text-gray-400 opacity-0'}`}>
                <Trans>Copied!</Trans>
              </span>
            </div>
          )}
          <FileUpload isDragging={isDragging} setIsDragging={setIsDragging} onFiles={handleFiles} />
          <CourseList
            courses={courses} loading={loading}
            onToggle={toggleCourse} onClear={handleClear} onGenerate={handleGenerate}
            onLockGroup={handleLockGroup} onReorder={handleReorder}
            whatIfExclusions={whatIfExclusions} onToggleWhatIf={toggleWhatIf}
          />
        </div>
        <ScheduleResults
          schedules={schedules} daySettings={daySettings} dailyCommute={dailyCommute}
          classesPerDay={classesPerDay} maxOverlap={maxOverlap} maxResults={maxResults}
          instructorPrefs={instructorPrefs}
          hasSearched={hasSearched} loading={loading} limitWarning={limitWarning}
          rejections={rejections} courses={courses}
          onTogglePin={handleTogglePin}
          onAddBusyPeriod={addBusyPeriod}
          onRemoveBusyPeriod={removeBusyPeriod}
        />
      </div>
    </div>
  );
}
