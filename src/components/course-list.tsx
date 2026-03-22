import { useState, useRef, useEffect } from "preact/hooks";
import {
  Trash2,
  CheckCircle,
  Lock,
  GripVertical,
  EyeOff,
  ChevronDown,
  Ban,
  X,
  Copy,
} from "lucide-preact";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import * as m from "@/paraglide/messages";
import type { Course } from "@/lib/types";
import { cx } from "@/lib/cx";

interface CourseListProps {
  courses: Course[];
  loading: boolean;
  onToggle: (index: number) => void;
  onClear: () => void;
  onGenerate: () => void;
  onLockGroup: (courseIdx: number, groupName: string | undefined) => void;
  onExcludeGroups: (courseIdx: number, excludedGroups: string[]) => void;
  onReorder: (courses: Course[]) => void;
  whatIfExclusions: Set<string>;
  onToggleWhatIf: (courseName: string) => void;
  onRemove: (courseName: string) => void;
  onDuplicate?: (courseName: string) => void;
  enableWhatIf?: boolean;
  enableDuplicate?: boolean;
}

function GroupPopover({ course, index, onLockGroup, onExcludeGroups }: {
  course: Course; index: number;
  onLockGroup: (i: number, g: string | undefined) => void;
  onExcludeGroups: (i: number, excluded: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const excluded = course.excludedGroups ?? [];
  const excludedCount = excluded.length;
  const hasLocked = !!course.lockedGroup;

  const handleLock = (groupName: string) => {
    if (course.lockedGroup === groupName) {
      onLockGroup(index, undefined);
    } else {
      onLockGroup(index, groupName);
      // Remove from excluded if locking it
      if (excluded.includes(groupName)) {
        onExcludeGroups(index, excluded.filter(g => g !== groupName));
      }
    }
  };

  const handleExclude = (groupName: string) => {
    // Can't exclude a locked group — unlock first
    if (course.lockedGroup === groupName) {
      onLockGroup(index, undefined);
    }
    if (excluded.includes(groupName)) {
      onExcludeGroups(index, excluded.filter(g => g !== groupName));
    } else {
      onExcludeGroups(index, [...excluded, groupName]);
    }
  };

  // Label for the trigger button
  let label: string = m.any_group();
  if (hasLocked) label = course.lockedGroup ?? label;
  else if (excludedCount > 0) label = m.count_ratio({ 0: course.groups.length - excludedCount, 1: course.groups.length });

  return (
    <div class={styles.popoverWrap} ref={ref}>
      <button type="button"
        onClick={() => setOpen(!open)}
        class={cx(
          styles.triggerButton,
          hasLocked
            ? styles.triggerLocked
            : excludedCount > 0
              ? styles.triggerExcluded
              : styles.triggerDefault,
        )}
        aria-label={m.manage_groups_for_course({ 0: course.courseName })}
      >
        {hasLocked && <Lock class={styles.triggerIcon} />}
        {!hasLocked && excludedCount > 0 && <Ban class={styles.triggerIcon} />}
        <span class={styles.triggerLabel}>{label}</span>
        <ChevronDown class={styles.triggerIcon} />
      </button>

      {open && (
        <div class={styles.popoverMenu}>
          <div class={styles.popoverHeader}>
            {m.groups()}
          </div>
          {course.groups.map(g => {
            const isLocked = course.lockedGroup === g.name;
            const isExcluded = excluded.includes(g.name);
            return (
              <div key={g.name} class={cx(styles.popoverRow, isExcluded ? styles.popoverRowExcluded : isLocked ? styles.popoverRowLocked : "")}>
                <div class={styles.popoverRowBody}>
                  <div class={cx(styles.groupName, isExcluded ? styles.groupNameExcluded : styles.groupNameActive)}>
                    {g.name}
                  </div>
                  <div class={styles.groupLecturer}>{g.lecturer}</div>
                </div>
                <button type="button"
                  onClick={() => handleLock(g.name)}
                  title={isLocked ? m.unlock() : m.lock_to_this_group_only()}
                  class={cx(styles.actionButton, isLocked ? styles.lockActive : styles.lockIdle)}
                >
                  <Lock class={styles.actionIcon} />
                </button>
                <button type="button"
                  onClick={() => handleExclude(g.name)}
                  title={isExcluded ? m.mark_available() : m.mark_as_occupied()}
                  class={cx(styles.actionButton, isExcluded ? styles.excludeActive : styles.excludeIdle)}
                >
                  <Ban class={styles.actionIcon} />
                </button>
              </div>
            );
          })}
          {(hasLocked || excludedCount > 0) && (
            <button type="button"
              onClick={() => { onLockGroup(index, undefined); onExcludeGroups(index, []); }}
              class={styles.resetButton}
            >
              <X class={styles.resetIcon} /> {m.reset_all()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SortableCourseItem({ course, index, onToggle, onLockGroup, onExcludeGroups, isWhatIfExcluded, onToggleWhatIf, onRemove, onDuplicate, enableWhatIf, enableDuplicate }: {
  course: Course; index: number;
  onToggle: (i: number) => void;
  onLockGroup: (i: number, g: string | undefined) => void;
  onExcludeGroups: (i: number, excluded: string[]) => void;
  isWhatIfExcluded: boolean;
  onToggleWhatIf: (name: string) => void;
  onRemove: (name: string) => void;
  onDuplicate?: (name: string) => void;
  enableWhatIf?: boolean;
  enableDuplicate?: boolean;
}) {
  const { ref, isDragging } = useSortable({ id: course.courseName, index });
  return (
    <li ref={ref} class={cx(styles.courseRow, "group", isDragging && styles.dragging)}>
      {/* Drag handle */}
      <div class={styles.dragHandle}>
        <GripVertical class={styles.dragIcon} />
      </div>

      {/* Course card — full-width on mobile, pill on desktop */}
      <div
        class={cx(
          styles.courseCard,
          isWhatIfExcluded
            ? styles.cardWhatIf
            : course.isActive
              ? styles.cardActive
              : styles.cardInactive,
        )}
      >
        {/* Toggle checkbox area */}
        <button type="button" onClick={() => onToggle(index)} class={styles.toggleButton} aria-label={course.isActive ? m.deactivate() : m.activate()}>
          {course.isActive ? <CheckCircle class={styles.toggleIcon} /> : <div class={styles.toggleEmpty} />}
        </button>

        {/* Course name — takes remaining space */}
        <button type="button" onClick={() => onToggle(index)} class={styles.courseNameButton}>
          <span class={cx(styles.courseName, course.isActive ? styles.courseNameActive : styles.courseNameInactive)}>
            {course.subjectCode && <span class={styles.courseCode}>{course.subjectCode}</span>}
            {course.courseName}
          </span>
        </button>

        {/* Status badges */}
        {course.lockedGroup && <Lock class={styles.statusIconLocked} />}
        {!course.lockedGroup && (course.excludedGroups?.length ?? 0) > 0 && <Ban class={styles.statusIconExcluded} />}

        {/* Actions — visible on mobile, on-hover on desktop */}
        <div class={styles.actions}>
          {enableWhatIf !== false && course.isActive && (
            <button type="button"
              onClick={(e) => { e.stopPropagation(); onToggleWhatIf(course.courseName); }}
              title={isWhatIfExcluded ? m.reinclude() : m.exclude_what_if()}
              class={cx(styles.actionIconButton, isWhatIfExcluded ? styles.actionWhatIfActive : styles.actionIconIdle)}
            >
              <EyeOff class={styles.actionIcon} />
            </button>
          )}
          {enableDuplicate && onDuplicate && (
            <button type="button"
              onClick={(e) => { e.stopPropagation(); onDuplicate(course.courseName); }}
              title={m.duplicate_course()}
              class={cx(styles.actionIconButton, styles.actionIconIdle)}
            >
              <Copy class={styles.actionIcon} />
            </button>
          )}
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(course.courseName); }}
            title={m.remove_course()}
            class={cx(styles.actionIconButton, styles.actionRemove)}
          >
            <Trash2 class={styles.actionIcon} />
          </button>
          {course.isActive && course.groups.length > 1 && (
            <GroupPopover course={course} index={index} onLockGroup={onLockGroup} onExcludeGroups={onExcludeGroups} />
          )}
        </div>
      </div>
    </li>
  );
}

export function CourseList({ courses, loading, onToggle, onClear, onGenerate, onLockGroup, onExcludeGroups, onReorder, whatIfExclusions, onToggleWhatIf, onRemove, onDuplicate, enableWhatIf, enableDuplicate }: CourseListProps) {
  if (courses.length === 0) return null;
  return (
    <div class={styles.listWrap}>
      <div class={styles.header}>
        <h3 class={styles.headerTitle}>{m.parsed_courses_count({ 0: courses.length })}</h3>
        <button type="button" onClick={onClear} class={styles.clearButton} aria-label="Clear all courses">
          <Trash2 class={styles.clearIcon} /> {m.clear()}
        </button>
      </div>
      <DragDropProvider
        onDragEnd={(event) => {
          const { operation } = event;
          const { source, target } = operation;
          if (!target || source?.id === target.id) return;
          const oldIdx = courses.findIndex(c => c.courseName === source?.id);
          const newIdx = courses.findIndex(c => c.courseName === target.id);
          if (oldIdx === -1 || newIdx === -1) return;
          const reordered = [...courses];
          const [moved] = reordered.splice(oldIdx, 1);
          reordered.splice(newIdx, 0, moved);
          onReorder(reordered.map((c, i) => ({ ...c, order: i })));
        }}
      >
        {/* Vertical list on mobile, wrap on desktop */}
        <ul class={styles.courseList} aria-label={m.course_list()}>
          {courses.map((c, i) => (
            <SortableCourseItem key={c.courseName} course={c} index={i} onToggle={onToggle} onLockGroup={onLockGroup}
              onExcludeGroups={onExcludeGroups}
              isWhatIfExcluded={whatIfExclusions.has(c.courseName)} onToggleWhatIf={onToggleWhatIf} onRemove={onRemove} onDuplicate={onDuplicate} enableWhatIf={enableWhatIf} enableDuplicate={enableDuplicate} />
          ))}
        </ul>
      </DragDropProvider>
      <button type="button"
        onClick={onGenerate}
        disabled={loading || courses.filter(c => c.isActive).length === 0}
        class={styles.generateButton}
      >
        {loading ? m.crunching_numbers() : m.generate_best_schedules()}
      </button>
    </div>
  );
}

const styles = {
  popoverWrap: "relative",
  triggerButton:
    "text-xs border border-solid rounded-lg py-1.5 px-2.5 flex items-center gap-1 cursor-pointer transition-colors",
  triggerLocked: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-300",
  triggerExcluded: "border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-300",
  triggerDefault: "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300",
  triggerIcon: "w-3 h-3 shrink-0",
  triggerLabel: "max-w-[6rem] sm:max-w-[8rem] truncate leading-normal",
  popoverMenu:
    "absolute right-0 top-full mt-1 min-w-[220px] max-w-[calc(100vw-2rem)] max-h-[300px] overflow-y-auto rounded-lg py-1 bg-white border border-gray-200 shadow-lg z-50 dark:bg-gray-800 dark:border-gray-600",
  popoverHeader:
    "px-3 py-1.5 text-xs font-semibold text-gray-500 border-b border-gray-100 dark:text-gray-400 dark:border-gray-700",
  popoverRow: "flex items-center px-3 py-2 text-sm gap-1.5",
  popoverRowExcluded: "bg-red-50/50 dark:bg-red-900/10",
  popoverRowLocked: "bg-amber-50/50 dark:bg-amber-900/10",
  popoverRowBody: "flex-1 min-w-0 space-y-0.5",
  groupName: "font-medium truncate",
  groupNameActive: "text-gray-700 dark:text-gray-300",
  groupNameExcluded: "line-through text-gray-400 dark:text-gray-400",
  groupLecturer: "text-xs text-gray-400 truncate dark:text-gray-400",
  actionButton: "p-1 rounded-md transition-colors cursor-pointer shrink-0",
  lockActive: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
  lockIdle: "text-gray-300 dark:text-gray-600 hover:text-amber-500",
  excludeActive: "text-red-500 bg-red-100 dark:bg-red-900/30",
  excludeIdle: "text-gray-300 dark:text-gray-600 hover:text-red-500",
  resetButton:
    "w-full flex items-center px-3 py-2 text-xs text-gray-500 border-t border-gray-100 transition-colors cursor-pointer gap-2 hover:bg-gray-100 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700",
  resetIcon: "w-3 h-3",
  courseRow: "flex items-center gap-1.5 sm:gap-1",
  dragging: "opacity-50",
  dragHandle:
    "cursor-grab text-gray-300 shrink-0 touch-none transition-colors hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400",
  dragIcon: "w-4 h-4",
  courseCard:
    "flex-1 min-w-0 flex items-center border border-transparent rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors gap-2 sm:rounded-full sm:px-3 sm:py-1.5 sm:gap-1.5",
  cardWhatIf:
    "bg-amber-50 text-amber-700 border-amber-300 opacity-80 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  cardActive:
    "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  cardInactive:
    "bg-gray-50 text-gray-400 border-gray-200 opacity-60 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  toggleButton: "shrink-0 flex items-center cursor-pointer",
  toggleIcon: "w-4 h-4 text-blue-500 dark:text-blue-400",
  toggleEmpty: "w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600",
  courseNameButton: "flex-1 min-w-0 text-left cursor-pointer",
  courseName: "block truncate",
  courseNameActive: "font-medium",
  courseNameInactive: "line-through",
  courseCode: "font-mono text-[11px] opacity-60 mr-1",
  statusIconLocked: "w-3 h-3 text-amber-500 shrink-0",
  statusIconExcluded: "w-3 h-3 text-red-400 shrink-0",
  actions: "flex items-center shrink-0 gap-0.5",
  actionIconButton: "p-1 rounded-md transition-opacity transition-colors cursor-pointer",
  actionIconIdle: "text-gray-300 dark:text-gray-600 hover:text-blue-400 sm:opacity-0 sm:group-hover:opacity-100",
  actionWhatIfActive: "text-amber-500",
  actionRemove: "text-gray-300 dark:text-gray-600 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100",
  actionIcon: "w-3.5 h-3.5",
  listWrap: "mt-6",
  header: "flex items-center justify-between mb-3",
  headerTitle: "font-semibold text-lg text-gray-700 dark:text-gray-200",
  clearButton: "flex items-center text-sm font-medium text-red-500 transition-colors cursor-pointer gap-1 hover:text-red-700",
  clearIcon: "w-4 h-4",
  courseList: "flex flex-col gap-2 mb-6 sm:flex-row sm:flex-wrap sm:gap-1",
  generateButton:
    "w-full px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow-sm transition-colors cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto",
};

