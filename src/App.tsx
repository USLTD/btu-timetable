import { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Sun, Moon, Monitor, Download, Share2, Import, Copy, Check, Printer, Undo2, Redo2, Puzzle, X } from 'lucide-react';
import { Trans, useLingui } from '@lingui/react/macro';
import { usePwaInstall } from './lib/use-pwa-install.ts';
import { encodeState, importHash, shareToUrl } from './lib/url-state.ts';
import type { Course, DayNumber, DayPref, DaySetting, DaySettings, InstructorPref, MinMax, RejectionReason, ScoredSchedule } from './types.ts';
import { parseFiles } from './lib/parsers.ts';
import { usePersistedState } from './lib/storage.ts';
import { useTheme } from './lib/use-theme.ts';
import { useSchedulerWorker } from './lib/use-scheduler-worker.ts';
import { useUndoRedo } from './lib/use-undo-redo.ts';
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

  // Undo/redo for settings
  const settingsSnapshot = useMemo(() => ({
    daySettings, globalTime, classesPerDay, maxOverlap, dailyCommute, instructorPrefs,
  }), [daySettings, globalTime, classesPerDay, maxOverlap, dailyCommute, instructorPrefs]);

  const restoreSettings = useCallback((s: typeof settingsSnapshot) => {
    setDaySettings(s.daySettings);
    setGlobalTime(s.globalTime);
    setClassesPerDay(s.classesPerDay);
    setMaxOverlap(s.maxOverlap);
    setDailyCommute(s.dailyCommute);
    setInstructorPrefs(s.instructorPrefs);
  }, [setDaySettings, setGlobalTime, setClassesPerDay, setMaxOverlap, setDailyCommute, setInstructorPrefs]);

  const { undo, redo, canUndo, canRedo } = useUndoRedo(settingsSnapshot, restoreSettings);
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
  const handleRenameSchedule = (idx: number, label: string) => {
    const updated = [...schedules];
    updated[idx] = { ...updated[idx], label: label || undefined };
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
      } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) || ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        redo();
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8 font-sans transition-colors" role="main">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <Trans>Ultimate Schedule Optimizer</Trans>
            </h1>
            <div className="flex items-center gap-1 flex-wrap">
              {/* Locale switcher */}
              <select
                value={currentLocale}
                onChange={e => switchLocale(e.target.value as Locale)}
                className="text-sm border dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
                title={t`Language`}
                aria-label={t`Choose language`}
              >
                {Object.entries(locales).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              {canInstall && (
                <button onClick={install} title={t`Install App`} aria-label={t`Install App`}
                  className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500">
                  <Download className="w-5 h-5" />
                </button>
              )}
              <button onClick={handleShare} title={shared ? t`Link copied!` : t`Share (copy URL)`} aria-label={t`Share settings`}
                className={`p-2 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${shared ? 'text-green-500' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {shared ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              </button>
              <button onClick={() => window.print()} title={t`Print schedule`} aria-label={t`Print schedule`}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors no-print focus-visible:ring-2 focus-visible:ring-blue-500">
                <Printer className="w-5 h-5" />
              </button>
              <button onClick={undo} disabled={!canUndo} title={t`Undo (Ctrl+Z)`}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 no-print"
                aria-label={t`Undo`}>
                <Undo2 className="w-5 h-5" />
              </button>
              <button onClick={redo} disabled={!canRedo} title={t`Redo (Ctrl+Y)`}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 no-print"
                aria-label={t`Redo`}>
                <Redo2 className="w-5 h-5" />
              </button>
              <button onClick={cycleTheme} title={t`Theme: ${theme}`} aria-label={t`Toggle theme`}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500">
                {themeIcon}
              </button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 no-print">
            <Trans>Upload course files, dial in your precise constraints, and find your perfect week.</Trans>
          </p>
          {!localStorage.getItem('hide-userscript-hint') && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-300 no-print">
              <Puzzle className="w-4 h-4 shrink-0" />
              <span className="flex-1">
                <Trans>Tip: Install the</Trans>{' '}
                <a href="https://userscripts.usltd.ge/btu-timetable-helper.user.js"
                  target="_blank" rel="noopener noreferrer"
                  className="font-medium underline hover:text-amber-900 dark:hover:text-amber-200 transition-colors">
                  <Trans>BTU Helper Userscript</Trans>
                </a>{' '}
                <Trans>to export timetable pages directly from BTU's website.</Trans>
              </span>
              <button onClick={(e) => { (e.currentTarget.parentElement as HTMLElement).remove(); localStorage.setItem('hide-userscript-hint', '1'); }}
                className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors shrink-0"
                aria-label={t`Dismiss`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="no-print">
            <SettingsPanel
              dailyCommute={dailyCommute} setDailyCommute={setDailyCommute}
              classesPerDay={classesPerDay} setClassesPerDay={setClassesPerDay}
              maxOverlap={maxOverlap} setMaxOverlap={setMaxOverlap}
              globalTime={globalTime} updateGlobalTime={updateGlobalTime}
              daySettings={daySettings} toggleDayPref={toggleDayPref} updateDayTime={updateDayTime} updateDaySetting={updateDaySetting}
              showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced}
              courses={courses} instructorPrefs={instructorPrefs} setInstructorPrefs={setInstructorPrefs}
            />
          </div>
          {/* Import / Export hash controls */}
          <div className="flex flex-wrap items-center gap-2 mb-3 no-print">
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
          <div className="no-print">
            <FileUpload isDragging={isDragging} setIsDragging={setIsDragging} onFiles={handleFiles} />
            <CourseList
              courses={courses} loading={loading}
              onToggle={toggleCourse} onClear={handleClear} onGenerate={handleGenerate}
              onLockGroup={handleLockGroup} onReorder={handleReorder}
              whatIfExclusions={whatIfExclusions} onToggleWhatIf={toggleWhatIf}
            />
          </div>
        </div>
        <ScheduleResults
          schedules={schedules} daySettings={daySettings} dailyCommute={dailyCommute}
          classesPerDay={classesPerDay} maxOverlap={maxOverlap} maxResults={maxResults}
          instructorPrefs={instructorPrefs}
          hasSearched={hasSearched} loading={loading} limitWarning={limitWarning}
          rejections={rejections} courses={courses}
          onTogglePin={handleTogglePin}
          onRenameSchedule={handleRenameSchedule} onLockGroup={handleLockGroup} onAddBusyPeriod={addBusyPeriod}
          onRemoveBusyPeriod={removeBusyPeriod}
        />

        <footer className="mt-8 pb-4 text-center text-xs text-gray-400 dark:text-gray-500 no-print">
          2026 © Luka Mamukashvili
        </footer>
      </div>
    </div>
  );
}
