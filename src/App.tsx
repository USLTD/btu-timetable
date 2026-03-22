import { useCallback, useMemo, useState } from "preact/hooks";
import { SystemBanner } from "@/components/system-banner";
import { useToast } from "@/components/toast";
import { AppProviders } from "@/providers/app-providers";
import { AppHeader } from "@/components/app-header";
import { AppToolbar } from "@/components/app-toolbar";
import { UserscriptSection } from "@/components/userscript-section";
import { MainContent } from "@/components/main-content";
import { HydrationIndicator } from "@/components/hydration-indicator";
import { FeatureFlagsDialog } from "@/components/feature-flags-dialog";
import { ManualCourseDialog } from "@/components/manual-course-dialog";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { PrivacyPolicy } from "@/components/legal/privacy-policy";
import { TermsOfService } from "@/components/legal/terms-of-service";
import { SettingsPanel } from "@/components/settings-panel";
import { FileUpload } from "@/components/file-upload";
import { HashIO } from "@/components/hash-io";
import { useSchedulerWorker } from "@/hooks/use-scheduler-worker";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useMockData } from "@/hooks/use-mock-data";
import { copyToClipboard } from "@/lib/clipboard";
import { cx } from "@/lib/cx";
import { useFeatureFlags } from "@/lib/feature-flags";
import { parseFiles } from "@/lib/parsers";
import type { ShareableState } from "@/lib/shareable-state";
import type { BusyPeriod, Course, DayNumber } from "@/lib/types";
import { encodeProtoHash, importProtoHash, shareToUrlProto } from "@/lib/url-state";
import * as m from "@/paraglide/messages";
import { usePageContext } from "@/renderer/usePageContext";
import { useSchedule } from "@/contexts/schedule-context";
import { useCourse } from "@/contexts/course-context";
import { useSettings } from "@/contexts/settings-context";
import { useUI } from "@/contexts/ui-context";

export default function App() {
  const pageContext = usePageContext();
  const systemBannerText = (pageContext.data as Record<string, any>)?.systemBannerText;

  return (
    <AppProviders>
      <AppContent systemBannerText={systemBannerText} />
    </AppProviders>
  );
}

function AppContent({ systemBannerText }: { systemBannerText?: string }) {
  const { schedules, rejections, setSchedules, setRejections } = useSchedule();
  const { courses, setCourses, removeCourse, duplicateCourse, reorderCourses, toggleCourse } = useCourse();
  const {
    dailyCommute,
    classesPerDay,
    classesPerDayEnabled,
    maxOverlap,
    maxOverlapEnabled,
    maxDaysOnCampus,
    globalTime,
    daySettings,
    lecturerPrefs,
    minRating,
    setDailyCommute,
    setClassesPerDay,
    setClassesPerDayEnabled,
    setMaxOverlap,
    setMaxOverlapEnabled,
    setMaxDaysOnCampus,
    setGlobalTime,
    setDaySettings,
    setLecturerPrefs,
    setMinRating,
    toggleDayPref,
    updateGlobalTime,
    updateDayTime,
    updateDaySetting,
  } = useSettings();
  const {
    isLoading,
    setLoading,
    showPrivacy,
    setShowPrivacy,
    showTerms,
    setShowTerms,
    showFeatureFlags,
    setShowFeatureFlags,
    showManualCourse,
    setShowManualCourse,
    showImport,
    setShowImport,
    importText,
    setImportText,
    exportHash,
    setExportHash,
    hasSearched,
    setHasSearched,
    limitWarning,
    setLimitWarning,
  } = useUI();

  useMockData();

  const { toast } = useToast();
  const { flags } = useFeatureFlags();
  const scheduler = useSchedulerWorker();

  const [shared, setShared] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [whatIfExclusions, setWhatIfExclusions] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const maxResults = 20;

  const settingsSnapshot = useMemo(
    () => ({
      daySettings,
      globalTime,
      classesPerDay,
      maxOverlap,
      dailyCommute,
      lecturerPrefs,
    }),
    [
      daySettings,
      globalTime,
      classesPerDay,
      maxOverlap,
      dailyCommute,
      lecturerPrefs,
    ],
  );

  const restoreSettings = useCallback(
    (s: typeof settingsSnapshot) => {
      setDaySettings(s.daySettings);
      setGlobalTime(s.globalTime);
      setClassesPerDay(s.classesPerDay);
      setMaxOverlap(s.maxOverlap);
      setDailyCommute(s.dailyCommute);
      setLecturerPrefs(s.lecturerPrefs);
    },
    [
      setDaySettings,
      setGlobalTime,
      setClassesPerDay,
      setMaxOverlap,
      setDailyCommute,
      setLecturerPrefs,
    ],
  );

  const { undo, redo, canUndo, canRedo } = useUndoRedo(
    settingsSnapshot,
    restoreSettings,
  );

  const handleShare = useCallback(async () => {
    try {
      const state: ShareableState = {
        courses,
        daySettings,
        globalTime,
        classesPerDay,
        maxOverlap,
        dailyCommute,
        lecturerPrefs,
      };
      const url = shareToUrlProto(state);
      await copyToClipboard(url);
      setShared(true);
      toast(m.link_copied_to_clipboard());
      setTimeout(() => setShared(false), 3000);
    } catch (error) {
      console.error("Failed to share:", error);
      toast(m.error_unexpected());
    }
  }, [
    courses,
    daySettings,
    globalTime,
    classesPerDay,
    maxOverlap,
    dailyCommute,
    lecturerPrefs,
    toast,
  ]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleFiles = useCallback(async (files: FileList) => {
    try {
      const parsedCourses = await parseFiles(files, courses);
      setCourses(parsedCourses);
      toast(m.parsed_courses_count({ 0: parsedCourses.length }));
    } catch (error) {
      console.error("Failed to parse files:", error);
      toast(m.error_unexpected());
    }
  }, [courses, setCourses, toast]);

  const handleImport = useCallback(() => {
    try {
      const success = importProtoHash(importText);
      if (success) {
        setShowImport(false);
        setImportText("");
        setExportHash("");
        setHasSearched(false);
        setLimitWarning(false);
        toast(m.backup_file_imported());
      } else {
        toast(m.backup_file_import_failed());
      }
    } catch (error) {
      console.error("Failed to import:", error);
      toast(m.backup_file_import_failed());
    }
  }, [
    importText,
    setShowImport,
    setImportText,
    setExportHash,
    setHasSearched,
    setLimitWarning,
    toast,
  ]);

  const handleExport = useCallback(() => {
    try {
      const state: ShareableState = {
        courses,
        daySettings,
        globalTime,
        classesPerDay,
        maxOverlap,
        dailyCommute,
        lecturerPrefs,
      };
      const hash = encodeProtoHash(state);
      setExportHash(hash);
      setShowImport(false);
      toast(m.export_code());
    } catch (error) {
      console.error("Failed to export:", error);
      toast(m.error_unexpected());
    }
  }, [
    courses,
    daySettings,
    globalTime,
    classesPerDay,
    maxOverlap,
    dailyCommute,
    lecturerPrefs,
    setExportHash,
    setShowImport,
    toast,
  ]);

  const handleAddManualCourse = useCallback(
    (course: Course) => {
      setCourses((prev) => {
        const existingNames = prev.map((c) => c.courseName);
        const name = existingNames.includes(course.courseName)
          ? `${course.courseName} (${prev.length + 1})`
          : course.courseName;
        return [...prev, { ...course, courseName: name, order: prev.length }];
      });
    },
    [setCourses],
  );

  const handleTogglePin = useCallback(
    (idx: number) => {
      setSchedules((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], pinned: !updated[idx].pinned };
        return updated;
      });
    },
    [setSchedules],
  );

  const handleRenameSchedule = useCallback((idx: number, label: string) => {
    const updated = [...schedules];
    updated[idx] = { ...updated[idx], label: label || undefined };
    setSchedules(updated);
  }, [schedules, setSchedules]);

  const handleGenerate = useCallback(async () => {
    if (courses.length === 0) {
      toast(m.add_course());
      return;
    }

    const effectiveCourses = whatIfExclusions.size > 0
      ? courses.map((c) =>
          whatIfExclusions.has(c.courseName) ? { ...c, isActive: false } : c,
        )
      : courses;

    const activeCourses = effectiveCourses.filter((c) => c.isActive);
    if (activeCourses.length === 0) {
      toast(m.activate());
      return;
    }

    setHasSearched(true);
    setLimitWarning(false);
    setLoading(true);

    try {
      const result = await scheduler.run(activeCourses, {
        daySettings,
        classesPerDay,
        maxOverlap,
        dailyCommute,
        maxResults,
        lecturerPrefs,
        minRating,
      });

      setSchedules(result.schedules);
      setRejections(result.rejections);
      setLimitWarning(result.limitReached);

      if (result.schedules.length === 0) {
        toast(m.no_valid_schedules_found());
      } else {
        toast(m.generated_schedules_count({ 0: result.schedules.length }));
      }
    } catch (error) {
      console.error("Generation failed:", error);
      toast(m.error_unexpected());
    } finally {
      setLoading(false);
    }
  }, [
    courses,
    whatIfExclusions,
    daySettings,
    classesPerDay,
    maxOverlap,
    dailyCommute,
    maxResults,
    lecturerPrefs,
    minRating,
    scheduler,
    setSchedules,
    setRejections,
    setHasSearched,
    setLimitWarning,
    setLoading,
    toast,
  ]);

  const handleClearCourses = useCallback(() => {
    setCourses([]);
    setSchedules([]);
    setRejections([]);
    setHasSearched(false);
    setLimitWarning(false);
    setWhatIfExclusions(new Set());
  }, [
    setCourses,
    setSchedules,
    setRejections,
    setHasSearched,
    setLimitWarning,
  ]);

  const handleToggleWhatIf = useCallback((courseName: string) => {
    setWhatIfExclusions((prev) => {
      const next = new Set(prev);
      if (next.has(courseName)) next.delete(courseName);
      else next.add(courseName);
      return next;
    });
  }, []);

  const handleLockGroup = useCallback((courseIdx: number, groupName: string | undefined) => {
    setCourses((prev) => prev.map((course, idx) =>
      idx === courseIdx ? { ...course, lockedGroup: groupName } : course,
    ));
  }, [setCourses]);

  const handleExcludeGroups = useCallback((courseIdx: number, excludedGroups: string[]) => {
    setCourses((prev) => prev.map((course, idx) =>
      idx === courseIdx ? { ...course, excludedGroups } : course,
    ));
  }, [setCourses]);

  const handleAddBusyPeriod = useCallback((dayNum: DayNumber, bp: BusyPeriod) => {
    const existing = daySettings[dayNum].busyPeriods ?? [];
    // Prevent overlaps
    const overlaps = existing.some(e => bp.start < e.end && e.start < bp.end);
    if (overlaps) return;
    updateDaySetting(dayNum, {
      busyPeriods: [...existing, bp].sort((a, b) => a.start - b.start),
    });
  }, [daySettings, updateDaySetting]);

  const handleRemoveBusyPeriod = useCallback((dayNum: DayNumber, bpIdx: number) => {
    const existing = daySettings[dayNum].busyPeriods ?? [];
    updateDaySetting(dayNum, {
      busyPeriods: existing.filter((_, i) => i !== bpIdx),
    });
  }, [daySettings, updateDaySetting]);

  return (
    <>
      <HydrationIndicator />
      <main class={styles.page}>
        <a href="#main-content" class={styles.skipLink}>
          {m.skip_to_main_content()}
        </a>
        <a href="#course-upload" class={styles.skipLink}>
          {m.skip_to_course_upload()}
        </a>
        <a href="#schedule-results" class={styles.skipLink}>
          {m.skip_to_schedule_results()}
        </a>

        <div id="main-content" class={styles.pageInner}>
          <div class={styles.card}>
            <div class={styles.toolbar}>
              <AppHeader />
              <AppToolbar
                shared={shared}
                onShare={handleShare}
                onPrint={handlePrint}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                onShowFeatureFlags={() => setShowFeatureFlags(true)}
              />
            </div>

            <p class={cx(styles.subtitle, styles.noPrint)}>
              {m.hero_subtitle()}
            </p>

            <UserscriptSection />

            <div class={styles.noPrint}>
              <SettingsPanel
                dailyCommute={dailyCommute}
                setDailyCommute={setDailyCommute}
                classesPerDay={classesPerDay}
                setClassesPerDay={setClassesPerDay}
                classesPerDayEnabled={classesPerDayEnabled}
                setClassesPerDayEnabled={setClassesPerDayEnabled}
                maxOverlap={maxOverlap}
                setMaxOverlap={setMaxOverlap}
                maxOverlapEnabled={maxOverlapEnabled}
                setMaxOverlapEnabled={setMaxOverlapEnabled}
                maxDaysOnCampus={maxDaysOnCampus}
                setMaxDaysOnCampus={setMaxDaysOnCampus}
                globalTime={globalTime}
                updateGlobalTime={updateGlobalTime}
                daySettings={daySettings}
                setDaySettings={setDaySettings}
                toggleDayPref={toggleDayPref}
                updateDayTime={updateDayTime}
                updateDaySetting={updateDaySetting}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                enableTemplates={flags["preset-week-templates"]}
              />
            </div>

            <HashIO
              showImport={showImport}
              setShowImport={setShowImport}
              importText={importText}
              setImportText={setImportText}
              exportHash={exportHash}
              setExportHash={setExportHash}
              onImport={handleImport}
              onExport={handleExport}
            />

            <div id="course-upload" class={styles.noPrint}>
              <FileUpload
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                onFiles={handleFiles}
                onOpenManualCourseDialog={() => setShowManualCourse(true)}
                hasCourses={courses.length > 0}
              />
            </div>

            <MainContent
              courses={courses}
              loading={isLoading}
              onToggleCourse={toggleCourse}
              onClearCourses={handleClearCourses}
              onGenerate={handleGenerate}
              onLockGroup={handleLockGroup}
              onExcludeGroups={handleExcludeGroups}
              onReorderCourses={reorderCourses}
              whatIfExclusions={whatIfExclusions}
              onToggleWhatIf={handleToggleWhatIf}
              onRemoveCourse={removeCourse}
              onDuplicateCourse={flags["quick-duplicate-course"] ? duplicateCourse : undefined}
              enableDuplicate={flags["quick-duplicate-course"]}
              dailyCommute={dailyCommute}
              classesPerDay={classesPerDay}
              maxOverlap={maxOverlap}
              daySettings={daySettings}
              lecturerPrefs={lecturerPrefs}
              setLecturerPrefs={setLecturerPrefs}
              minRating={minRating}
              setMinRating={setMinRating}
              maxResults={maxResults}
              schedules={schedules}
              rejections={rejections}
              hasSearched={hasSearched}
              limitWarning={limitWarning}
              onTogglePin={handleTogglePin}
              onRenameSchedule={handleRenameSchedule}
              onAddBusyPeriod={handleAddBusyPeriod}
              onRemoveBusyPeriod={handleRemoveBusyPeriod}
              onShowPrivacy={() => setShowPrivacy(true)}
              onShowTerms={() => setShowTerms(true)}
            />
          </div>
        </div>

        {systemBannerText && <SystemBanner text={systemBannerText} />}

        <FeatureFlagsDialog
          open={showFeatureFlags}
          onClose={() => setShowFeatureFlags(false)}
        />
        <ManualCourseDialog
          open={showManualCourse}
          onClose={() => setShowManualCourse(false)}
          onAddCourse={handleAddManualCourse}
          existingCourseNames={courses.map((c) => c.courseName)}
          enableBulkInput={flags["bulk-manual-input"]}
        />
        <ResponsiveDialog
          open={showPrivacy}
          onClose={() => setShowPrivacy(false)}
          title={m.privacy_policy()}
        >
          <PrivacyPolicy />
        </ResponsiveDialog>
        <ResponsiveDialog
          open={showTerms}
          onClose={() => setShowTerms(false)}
          title={m.terms_of_service()}
        >
          <TermsOfService />
        </ResponsiveDialog>
      </main>
    </>
  );
}

const styles = {
  page: "min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100",
  pageInner: "max-w-6xl mx-auto p-4 md:p-6",
  card: "bg-white rounded-2xl border border-gray-200 shadow p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700",
  toolbar:
    "flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-4",
  subtitle: "mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400",
  noPrint: "no-print",
  skipLink:
    "absolute left-0 -translate-y-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-400 z-50 rounded-br-lg",
};
