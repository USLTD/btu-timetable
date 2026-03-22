import { ScheduleResults } from "@/components/schedule-results";
import { CourseList } from "@/components/course-list";
import { LecturerPreferences } from "@/components/lecturer-preferences";
import { ConsentBannerClient } from "@/components/consent-banner-client";
import { ScrollTopClient } from "@/components/scroll-top-client";
import { ClientOnly } from "@/components/client-only";
import type { BusyPeriod, Course, ScoredSchedule, RejectionReason, DayNumber, DaySettings, MinMax, LecturerPref } from "@/lib/types";

interface MainContentProps {
  // Course data
  courses: Course[];
  loading: boolean;
  onToggleCourse: (index: number) => void;
  onClearCourses: () => void;
  onGenerate: () => void;
  onLockGroup: (courseIdx: number, groupName: string | undefined) => void;
  onExcludeGroups: (courseIdx: number, excludedGroups: string[]) => void;
  onReorderCourses: (reordered: Course[]) => void;
  whatIfExclusions: Set<string>;
  onToggleWhatIf: (courseName: string) => void;
  onRemoveCourse: (courseName: string) => void;
  onDuplicateCourse?: (courseName: string) => void;
  enableWhatIf?: boolean;
  enableDuplicate?: boolean;
  
  // Settings
  dailyCommute: MinMax;
  classesPerDay: MinMax;
  maxOverlap: number;
  daySettings: DaySettings;
  lecturerPrefs: LecturerPref[];
  setLecturerPrefs: (value: LecturerPref[]) => void;
  minRating: number;
  setMinRating: (value: number) => void;
  maxResults: number;
  
  // Schedule data
  schedules: ScoredSchedule[];
  rejections: RejectionReason[];
  hasSearched: boolean;
  limitWarning: boolean;
  onTogglePin: (idx: number) => void;
  onRenameSchedule: (idx: number, label: string) => void;

  // Busy periods (calendar interaction)
  onAddBusyPeriod?: (dayNum: DayNumber, bp: BusyPeriod) => void;
  onRemoveBusyPeriod?: (dayNum: DayNumber, bpIdx: number) => void;

  onShowPrivacy: () => void;
  onShowTerms: () => void;
}

export function MainContent({
  courses,
  loading,
  onToggleCourse,
  onClearCourses,
  onGenerate,
  onLockGroup,
  onExcludeGroups,
  onReorderCourses,
  whatIfExclusions,
  onToggleWhatIf,
  onRemoveCourse,
  onDuplicateCourse,
  enableWhatIf,
  enableDuplicate,
  dailyCommute,
  classesPerDay,
  maxOverlap,
  daySettings,
  lecturerPrefs,
  setLecturerPrefs,
  minRating,
  setMinRating,
  maxResults,
  schedules,
  rejections,
  hasSearched,
  limitWarning,
  onTogglePin,
  onRenameSchedule,
  onAddBusyPeriod,
  onRemoveBusyPeriod,
  onShowPrivacy,
  onShowTerms,
}: MainContentProps) {
  return (
    <>
      <CourseList
        courses={courses}
        loading={loading}
        onToggle={onToggleCourse}
        onClear={onClearCourses}
        onGenerate={onGenerate}
        onLockGroup={onLockGroup}
        onExcludeGroups={onExcludeGroups}
        onReorder={onReorderCourses}
        whatIfExclusions={whatIfExclusions}
        onToggleWhatIf={onToggleWhatIf}
        onRemove={onRemoveCourse}
        onDuplicate={onDuplicateCourse}
        enableWhatIf={enableWhatIf}
        enableDuplicate={enableDuplicate}
      />

      <LecturerPreferences
        courses={courses}
        lecturerPrefs={lecturerPrefs}
        setLecturerPrefs={setLecturerPrefs}
        minRating={minRating}
        setMinRating={setMinRating}
      />

      <ScheduleResults
        schedules={schedules}
        daySettings={daySettings}
        dailyCommute={dailyCommute}
        classesPerDay={classesPerDay}
        maxOverlap={maxOverlap}
        maxResults={maxResults}
        lecturerPrefs={lecturerPrefs}
        hasSearched={hasSearched}
        loading={loading}
        limitWarning={limitWarning}
        rejections={rejections}
        courses={courses}
        onTogglePin={onTogglePin}
        onRenameSchedule={onRenameSchedule}
        onAddBusyPeriod={onAddBusyPeriod}
        onRemoveBusyPeriod={onRemoveBusyPeriod}
        onLockGroup={onLockGroup}
      />

      <ClientOnly>
        <ConsentBannerClient
          onShowPrivacy={onShowPrivacy}
          onShowTerms={onShowTerms}
        />
      </ClientOnly>

      <ClientOnly>
        <ScrollTopClient />
      </ClientOnly>
    </>
  );
}
