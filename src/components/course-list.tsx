import { Trash2, CheckCircle, Lock, GripVertical, EyeOff } from 'lucide-react';
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
  onReorder: (courses: Course[]) => void;
  whatIfExclusions: Set<string>;
  onToggleWhatIf: (courseName: string) => void;
}
function SortableCourseItem({ course, index, onToggle, onLockGroup, isWhatIfExcluded, onToggleWhatIf }: {
  course: Course; index: number;
  onToggle: (i: number) => void;
  onLockGroup: (i: number, g: string | undefined) => void;
  isWhatIfExcluded: boolean;
  onToggleWhatIf: (name: string) => void;
}) {
  const { ref, isDragging } = useSortable({ id: course.courseName, index });
  const { t } = useLingui();
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
      </button>
      {course.isActive && (
        <button
          onClick={() => onToggleWhatIf(course.courseName)}
          title={isWhatIfExcluded ? t`Re-include in "What if"` : t`Exclude in "What if" mode`}
          aria-label={isWhatIfExcluded ? t`Re-include ${course.courseName}` : t`Exclude ${course.courseName}`}
          className={`p-1 rounded transition-colors ${isWhatIfExcluded ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`}
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      )}
      {course.isActive && course.groups.length > 1 && (
        <select
          value={course.lockedGroup ?? ''}
          onChange={e => onLockGroup(index, e.target.value || undefined)}
          className="text-xs border dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 dark:text-gray-300 max-w-30 truncate"
          title={t`Lock to a specific group`}
          aria-label={t`Lock group for ${course.courseName}`}
        >
          <option value="">{t`Any group`}</option>
          {course.groups.map(g => (
            <option key={g.name} value={g.name}>{g.name} - {g.instructor}</option>
          ))}
        </select>
      )}
    </div>
  );
}
export function CourseList({ courses, loading, onToggle, onClear, onGenerate, onLockGroup, onReorder, whatIfExclusions, onToggleWhatIf }: CourseListProps) {
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