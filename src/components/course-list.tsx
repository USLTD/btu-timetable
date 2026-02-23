import { useState, useRef, useEffect } from 'react';
import { Trash2, CheckCircle, Lock, GripVertical, EyeOff, ChevronDown, Ban, X } from 'lucide-react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { Trans, useLingui } from '@lingui/react/macro';
import type { Course } from '../types.ts';

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
}

function GroupPopover({ course, index, onLockGroup, onExcludeGroups }: {
  course: Course; index: number;
  onLockGroup: (i: number, g: string | undefined) => void;
  onExcludeGroups: (i: number, excluded: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLingui();

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
  let label = t`Any group`;
  if (hasLocked) label = course.lockedGroup!;
  else if (excludedCount > 0) label = t`${course.groups.length - excludedCount}/${course.groups.length}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`text-xs border rounded px-2 py-1.5 flex items-center gap-1 min-h-[36px] transition-colors ${hasLocked
            ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
            : excludedCount > 0
              ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        aria-label={t`Manage groups for ${course.courseName}`}
      >
        {hasLocked && <Lock className="w-3 h-3 shrink-0" />}
        {!hasLocked && excludedCount > 0 && <Ban className="w-3 h-3 shrink-0" />}
        <span className="truncate max-w-24 sm:max-w-32">{label}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 min-w-[220px] py-1 max-h-[300px] overflow-y-auto">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            {t`Groups`}
          </div>
          {course.groups.map(g => {
            const isLocked = course.lockedGroup === g.name;
            const isExcluded = excluded.includes(g.name);
            return (
              <div key={g.name} className={`flex items-center gap-1.5 px-3 py-2 text-sm ${isExcluded ? 'bg-red-50/50 dark:bg-red-900/10' : isLocked ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                }`}>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${isExcluded ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {g.name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{g.lecturer}</div>
                </div>
                <button
                  onClick={() => handleLock(g.name)}
                  title={isLocked ? t`Unlock` : t`Lock to this group only`}
                  className={`p-1 rounded transition-colors shrink-0 ${isLocked
                      ? 'text-amber-500 bg-amber-100 dark:bg-amber-900/30'
                      : 'text-gray-300 dark:text-gray-600 hover:text-amber-500'
                    }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExclude(g.name)}
                  title={isExcluded ? t`Mark available` : t`Mark as occupied`}
                  className={`p-1 rounded transition-colors shrink-0 ${isExcluded
                      ? 'text-red-500 bg-red-100 dark:bg-red-900/30'
                      : 'text-gray-300 dark:text-gray-600 hover:text-red-500'
                    }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {(hasLocked || excludedCount > 0) && (
            <button
              onClick={() => { onLockGroup(index, undefined); onExcludeGroups(index, []); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
            >
              <X className="w-3 h-3" /> {t`Reset all`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SortableCourseItem({ course, index, onToggle, onLockGroup, onExcludeGroups, isWhatIfExcluded, onToggleWhatIf }: {
  course: Course; index: number;
  onToggle: (i: number) => void;
  onLockGroup: (i: number, g: string | undefined) => void;
  onExcludeGroups: (i: number, excluded: string[]) => void;
  isWhatIfExcluded: boolean;
  onToggleWhatIf: (name: string) => void;
}) {
  const { ref, isDragging } = useSortable({ id: course.courseName, index });
  return (
    <div ref={ref} className={`flex items-center gap-1 ${isDragging ? 'opacity-50' : ''}`} role="listitem">
      <div className="cursor-grab text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 touch-none p-1">
        <GripVertical className="w-4 h-4" />
      </div>
      <button
        onClick={() => onToggle(index)}
        className={`border px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-colors cursor-pointer ${isWhatIfExcluded
          ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 opacity-80'
          : course.isActive
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700'
            : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-70'
          }`}
      >
        {course.isActive ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-400 dark:border-gray-600" />}
        <span className={course.isActive ? 'font-medium' : 'line-through'}>
          {course.subjectCode ? <span className="font-mono text-xs opacity-70 mr-1">{course.subjectCode}</span> : ''}
          {course.courseName}
        </span>
        {course.lockedGroup && <Lock className="w-3 h-3 text-amber-500" />}
        {!course.lockedGroup && (course.excludedGroups?.length ?? 0) > 0 && <Ban className="w-3 h-3 text-red-400" />}
      </button>
      {course.isActive && (
        <button
          onClick={() => onToggleWhatIf(course.courseName)}
          title={isWhatIfExcluded ? 'Re-include' : 'Exclude in \"What if\" mode'}
          className={`p-1 rounded transition-colors ${isWhatIfExcluded ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`}
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      )}
      {course.isActive && course.groups.length > 1 && (
        <GroupPopover course={course} index={index} onLockGroup={onLockGroup} onExcludeGroups={onExcludeGroups} />
      )}
    </div>
  );
}

export function CourseList({ courses, loading, onToggle, onClear, onGenerate, onLockGroup, onExcludeGroups, onReorder, whatIfExclusions, onToggleWhatIf }: CourseListProps) {
  if (courses.length === 0) return null;
  const { t } = useLingui();
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-lg"><Trans>Parsed Courses ({courses.length})</Trans></h3>
        <button onClick={onClear} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-medium">
          <Trash2 className="w-4 h-4" /> <Trans>Clear</Trans>
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
        <div className="flex flex-wrap gap-2 mb-6" role="list" aria-label={t`Course list`}>
          {courses.map((c, i) => (
            <SortableCourseItem key={c.courseName} course={c} index={i} onToggle={onToggle} onLockGroup={onLockGroup}
              onExcludeGroups={onExcludeGroups}
              isWhatIfExcluded={whatIfExclusions.has(c.courseName)} onToggleWhatIf={onToggleWhatIf} />
          ))}
        </div>
      </DragDropProvider>
      <button
        onClick={onGenerate}
        disabled={loading || courses.filter(c => c.isActive).length === 0}
        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-lg shadow-sm"
      >
        {loading ? t`Crunching numbers...` : t`Generate Best Schedules`}
      </button>
    </div>
  );
}