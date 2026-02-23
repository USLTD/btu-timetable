import { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Sun, Moon, Monitor, Download, Share2, Import, Copy, Check, Printer, Undo2, Redo2, Puzzle, X, MoreHorizontal } from 'lucide-react';
import { Trans, useLingui } from '@lingui/react/macro';
import { usePwaInstall } from './lib/use-pwa-install.ts';
import { encodeState, importHash, shareToUrl } from './lib/url-state.ts';
import type { Course, DayNumber, DayPref, DaySetting, DaySettings, LecturerPref, MinMax, RejectionReason, ScoredSchedule } from './types.ts';
import { parseFiles } from './lib/parsers.ts';
import { usePersistedState } from './lib/storage.ts';
import { useTheme } from './lib/use-theme.ts';
import { useToast } from './components/toast.tsx';
import { useSchedulerWorker } from './lib/use-scheduler-worker.ts';
import { useUndoRedo } from './lib/use-undo-redo.ts';
import { locales, loadCatalog, type Locale } from './i18n.ts';
import { SettingsPanel } from './components/settings-panel.tsx';
import { FileUpload } from './components/file-upload.tsx';
import { CourseList } from './components/course-list.tsx';
import { ScheduleResults } from './components/schedule-results.tsx';
import { ResponsiveDialog } from './components/responsive-dialog.tsx';
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
  const [lecturerPrefs, setLecturerPrefs] = usePersistedState<LecturerPref[]>('app-lecturer-prefs', []);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [limitWarning, setLimitWarning] = useState(false);
  const [rejections, setRejections] = useState<RejectionReason[]>([]);
  const [whatIfExclusions, setWhatIfExclusions] = useState<Set<string>>(new Set());
  const [focusedSchedule, setFocusedSchedule] = useState(0);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showToolbarMenu, setShowToolbarMenu] = useState(false);


  // Initialize state based on manual dismissal OR the global variable injected by the userscript
  const [showUserscriptHint, setShowUserscriptHint] = useState(() => {
    if (typeof window === 'undefined') return true;
    const manuallyDismissed = localStorage.getItem('dismissed-userscript-hint') === '1';
    const userscriptActive = !!(window as any).__BTU_USERSCRIPT_ACTIVE;
    return !manuallyDismissed && !userscriptActive;
  });

  const maxResults = 20;
  const { theme, cycleTheme } = useTheme();
  const { toast } = useToast();

  const themeIcon = theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />;
  const { canInstall, install } = usePwaInstall();
  const scheduler = useSchedulerWorker();

  // Undo/redo for settings
  const settingsSnapshot = useMemo(() => ({
    daySettings, globalTime, classesPerDay, maxOverlap, dailyCommute, lecturerPrefs,
  }), [daySettings, globalTime, classesPerDay, maxOverlap, dailyCommute, lecturerPrefs]);

  const restoreSettings = useCallback((s: typeof settingsSnapshot) => {
    setDaySettings(s.daySettings);
    setGlobalTime(s.globalTime);
    setClassesPerDay(s.classesPerDay);
    setMaxOverlap(s.maxOverlap);
    setDailyCommute(s.dailyCommute);
    setLecturerPrefs(s.lecturerPrefs);
  }, [setDaySettings, setGlobalTime, setClassesPerDay, setMaxOverlap, setDailyCommute, setLecturerPrefs]);

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
  const handleExcludeGroups = (courseIdx: number, excludedGroups: string[]) => {
    const updated = [...courses];
    updated[courseIdx] = { ...updated[courseIdx], excludedGroups };
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
        daySettings, classesPerDay, maxOverlap, dailyCommute, maxResults, lecturerPrefs,
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
    courses, daySettings, globalTime, classesPerDay, maxOverlap, dailyCommute, lecturerPrefs,
  }), [courses, daySettings, globalTime, classesPerDay, maxOverlap, dailyCommute, lecturerPrefs]);

  const handleShare = useCallback(() => {
    shareToUrl(buildShareableState());
    setShared(true);
    toast(t`Link copied to clipboard!`);
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

  // Listen for the custom event in case React loads faster than the userscript executes
  useEffect(() => {
    const handleDetected = () => setShowUserscriptHint(false);
    window.addEventListener('btu-userscript-detected', handleDetected);

    // Safety check for race conditions
    if (typeof window !== 'undefined' && (window as any).__BTU_USERSCRIPT_ACTIVE) {
      setShowUserscriptHint(false);
    }

    return () => window.removeEventListener('btu-userscript-detected', handleDetected);
  }, []);

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
              {/* Desktop-only: Undo, Redo, Print */}
              <button onClick={() => window.print()} title={t`Print schedule`} aria-label={t`Print schedule`}
                className="hidden sm:inline-flex p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors no-print focus-visible:ring-2 focus-visible:ring-blue-500">
                <Printer className="w-5 h-5" />
              </button>
              <button onClick={undo} disabled={!canUndo} title={t`Undo (Ctrl+Z)`}
                className="hidden sm:inline-flex p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 no-print"
                aria-label={t`Undo`}>
                <Undo2 className="w-5 h-5" />
              </button>
              <button onClick={redo} disabled={!canRedo} title={t`Redo (Ctrl+Y)`}
                className="hidden sm:inline-flex p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 no-print"
                aria-label={t`Redo`}>
                <Redo2 className="w-5 h-5" />
              </button>
              <button onClick={cycleTheme} title={t`Theme: ${theme}`} aria-label={t`Toggle theme`}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500">
                {themeIcon}
              </button>
              {/* Mobile overflow menu */}
              <div className="relative sm:hidden">
                <button onClick={() => setShowToolbarMenu(!showToolbarMenu)} aria-label={t`More options`}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showToolbarMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 min-w-[140px] py-1">
                    <button onClick={() => { undo(); setShowToolbarMenu(false); }} disabled={!canUndo}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                      <Undo2 className="w-4 h-4" /> {t`Undo`}
                    </button>
                    <button onClick={() => { redo(); setShowToolbarMenu(false); }} disabled={!canRedo}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                      <Redo2 className="w-4 h-4" /> {t`Redo`}
                    </button>
                    <button onClick={() => { window.print(); setShowToolbarMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Printer className="w-4 h-4" /> {t`Print`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 no-print">
            <Trans>Upload course files, dial in your precise constraints, and find your perfect week.</Trans>
          </p>
          {showUserscriptHint && (
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
              <button onClick={() => {
                localStorage.setItem('dismissed-userscript-hint', '1');
                setShowUserscriptHint(false);
              }
              }
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
              courses={courses} lecturerPrefs={lecturerPrefs} setLecturerPrefs={setLecturerPrefs}
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
            <FileUpload isDragging={isDragging} setIsDragging={setIsDragging} onFiles={handleFiles} hasCourses={courses.length > 0} />
            <CourseList
              courses={courses} loading={loading}
              onToggle={toggleCourse} onClear={handleClear} onGenerate={handleGenerate}
              onLockGroup={handleLockGroup} onExcludeGroups={handleExcludeGroups} onReorder={handleReorder}
              whatIfExclusions={whatIfExclusions} onToggleWhatIf={toggleWhatIf}
            />
          </div>
        </div>
        <ScheduleResults
          schedules={schedules} daySettings={daySettings} dailyCommute={dailyCommute}
          classesPerDay={classesPerDay} maxOverlap={maxOverlap} maxResults={maxResults}
          lecturerPrefs={lecturerPrefs}
          hasSearched={hasSearched} loading={loading} limitWarning={limitWarning}
          rejections={rejections} courses={courses}
          onTogglePin={handleTogglePin}
          onRenameSchedule={handleRenameSchedule} onLockGroup={handleLockGroup} onAddBusyPeriod={addBusyPeriod}
          onRemoveBusyPeriod={removeBusyPeriod}
        />

        <footer className="mt-8 pb-4 text-center text-xs text-gray-400 dark:text-gray-500 no-print space-y-1">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span>2026 © Luka Mamukashvili</span>
            <span>·</span>
            <a href="https://github.com/USLTD/btu-timetable" target="_blank" rel="noopener noreferrer"
              className="hover:text-blue-500 dark:hover:text-blue-400 underline transition-colors">Source Code</a>
            <span>·</span>
            <button onClick={() => setShowPrivacy(true)}
              className="hover:text-blue-500 dark:hover:text-blue-400 underline transition-colors">Privacy Policy</button>
            <span>·</span>
            <button onClick={() => setShowTerms(true)}
              className="hover:text-blue-500 dark:hover:text-blue-400 underline transition-colors">Terms of Service</button>
          </div>
        </footer>

        <ResponsiveDialog open={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy">
          <PrivacyContent />
        </ResponsiveDialog>

        <ResponsiveDialog open={showTerms} onClose={() => setShowTerms(false)} title="Terms of Service">
          <TermsContent />
        </ResponsiveDialog>
      </div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-4">
      <p className="text-gray-500 dark:text-gray-400 italic">Effective date: 23 February 2026</p>
      <p>Easy BTU Timetable (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;the App&rdquo;) operates the website <a href="https://timetable.usltd.ge" className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">timetable.usltd.ge</a> and the associated Progressive Web App (the &ldquo;Service&rdquo;).</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Information We Collect</h3>
      <p>We collect <strong>no personal data</strong> of any kind.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>No names, emails, student IDs, or any other identifiers.</li>
        <li>No IP addresses, device information, or analytics data are stored or transmitted by us.</li>
        <li>All course data, preferences, busy periods, and generated schedules are processed <strong>entirely in your browser</strong> using JavaScript and never leave your device.</li>
      </ul>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Local Storage and PWA Caching</h3>
      <p>The App uses your browser&apos;s localStorage and IndexedDB (via the PWA service worker) to save your course list, constraints, and pinned schedules and enable offline functionality. You can clear this data at any time via your browser settings. We have no access to it.</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Third-Party Services</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Hosting:</strong> GitHub Pages (static files only). GitHub&apos;s own privacy policy applies to any server logs they may keep; we do not receive or control them.</li>
        <li>No advertising, tracking pixels, Google Analytics, Meta pixels, or any other third-party scripts are used.</li>
      </ul>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Children&apos;s Privacy</h3>
      <p>The Service is intended for university students. We do not knowingly collect data from anyone under 18.</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Changes to This Policy</h3>
      <p>We may update this Privacy Policy occasionally. We will post the new version with a new effective date. Continued use after changes constitutes acceptance.</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Contact Us</h3>
      <p>Questions? Open an issue at <a href="https://github.com/USLTD/btu-timetable/issues" className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">github.com/USLTD/btu-timetable/issues</a> or email the maintainer via the repository.</p>
      <p className="text-gray-500 dark:text-gray-400 text-xs italic">This policy was last updated on 23 February 2026.</p>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="space-y-4">
      <p className="text-gray-500 dark:text-gray-400 italic">Effective date: 23 February 2026</p>
      <p>Welcome to Easy BTU Timetable (the &ldquo;Service&rdquo;), provided by USLTD at <a href="https://timetable.usltd.ge" className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">timetable.usltd.ge</a>.</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Acceptance of Terms</h3>
      <p>By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, please do not use the Service.</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Description of Service</h3>
      <p>The Service is a free, open-source Progressive Web App that helps students of Business and Technology University (BTU) generate optimal timetables from data exported from the BTU portal. All computation occurs locally in your browser.</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">User Responsibilities</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>You are responsible for verifying that any generated schedule complies with BTU rules and your actual course requirements.</li>
        <li>You must not use the Service for any unlawful purpose.</li>
        <li>You acknowledge that the Service is provided &ldquo;as is&rdquo; and may contain inaccuracies.</li>
      </ul>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Intellectual Property</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>The source code is licensed under the MIT License (see LICENSE file in the GitHub repository).</li>
        <li>All BTU logos, course names, and related materials remain the property of BTU. The App merely processes user-supplied data.</li>
      </ul>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Disclaimers and Limitation of Liability</h3>
      <p className="uppercase text-xs">THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT ANY WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</p>
      <p>We are not affiliated with BTU and make no representations about the accuracy or completeness of generated schedules. We shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages arising from your use of the Service, including but not limited to missed classes, scheduling conflicts, or academic consequences.</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Governing Law</h3>
      <p>These Terms are governed by the laws of Georgia (country), without regard to conflict-of-law principles. Any disputes shall be resolved in the courts of Tbilisi, Georgia.</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Changes to Terms</h3>
      <p>We may revise these Terms at any time. The updated version will be posted here with a new effective date. Your continued use constitutes acceptance.</p>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Contact</h3>
      <p>For questions, please open an issue at <a href="https://github.com/USLTD/btu-timetable" className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">github.com/USLTD/btu-timetable</a>.</p>
      <p className="text-gray-500 dark:text-gray-400 text-xs italic">&copy; 2026 USLTD &ndash; MIT Licensed Open Source Project</p>
    </div>
  );
}
