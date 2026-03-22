import { useCallback, useState } from "preact/hooks";
import { Plus, Trash2 } from "lucide-preact";
import { useLocale } from "@/lib/i18n";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { DAY_MAP, localizedDayName, normalizeDayKey } from "@/lib/constants";
import { formatTimeInput } from "@/lib/time";
import * as m from "@/paraglide/messages";
import type { Course, DayNumber } from "@/lib/types";
import { cx } from "@/lib/cx";

interface ManualCourseDialogProps {
  open: boolean;
  onClose: () => void;
  onAddCourse: (course: Course) => void;
  existingCourseNames: string[];
  enableBulkInput?: boolean;
}

interface TimeDraft {
  id: string;
  day: DayNumber;
  start: number;
  end: number;
  room: string;
}

interface GroupDraft {
  id: string;
  name: string;
  lecturer: string;
  times: TimeDraft[];
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

const createTime = (): TimeDraft => ({
  id: createId(),
  day: 1,
  start: 540,
  end: 600,
  room: "",
});


function parseTimeToken(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let hours: number;
  let minutes: number;
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(":").map(Number);
    hours = h;
    minutes = m;
  } else if (/^\d{3,4}$/.test(trimmed)) {
    const padded = trimmed.padStart(4, "0");
    hours = Number(padded.slice(0, 2));
    minutes = Number(padded.slice(2));
  } else {
    return null;
  }
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function parseDayToken(value: string): DayNumber | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[1-7]$/.test(trimmed)) return Number(trimmed) as DayNumber;
  const key = normalizeDayKey(trimmed);
  return DAY_MAP[key] ?? null;
}

function createGroup(): GroupDraft {
  return {
    id: createId(),
    name: "",
    lecturer: "",
    times: [createTime()],
  };
}

export function ManualCourseDialog({
  open,
  onClose,
  onAddCourse,
  existingCourseNames,
  enableBulkInput,
}: ManualCourseDialogProps) {
  const locale = useLocale();
  const [courseName, setCourseName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [groups, setGroups] = useState<GroupDraft[]>([createGroup()]);
  const [error, setError] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");

  const reset = useCallback(() => {
    setCourseName("");
    setSubjectCode("");
    setGroups([createGroup()]);
    setError("");
    setBulkText("");
    setBulkError("");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const updateGroup = (idx: number, patch: Partial<GroupDraft>) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    );
  };

  const updateTime = (
    groupIdx: number,
    timeIdx: number,
    patch: Partial<TimeDraft>,
  ) => {
    setGroups((prev) =>
      prev.map((g, gi) => {
        if (gi !== groupIdx) return g;
        const nextTimes = g.times.map((t, ti) => {
          if (ti !== timeIdx) return t;
          const next = { ...t, ...patch };
          if (patch.start != null) {
            next.start = Math.min(next.start, next.end - 15);
          }
          if (patch.end != null) {
            next.end = Math.max(next.end, next.start + 15);
          }
          return next;
        });
        return { ...g, times: nextTimes };
      }),
    );
  };

  const addGroup = () => setGroups((prev) => [...prev, createGroup()]);
  const removeGroup = (idx: number) =>
    setGroups((prev) => prev.filter((_, i) => i !== idx));
  const addTime = (groupIdx: number) =>
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIdx ? { ...g, times: [...g.times, createTime()] } : g,
      ),
    );
  const removeTime = (groupIdx: number, timeIdx: number) =>
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIdx
          ? { ...g, times: g.times.filter((_, ti) => ti !== timeIdx) }
          : g,
      ),
    );

  const handleSubmit = () => {
    const trimmedCourse = courseName.trim();
    if (!trimmedCourse) {
      setError(m.course_name_required());
      return;
    }
    if (
      existingCourseNames.some(
        (name) => name.toLowerCase() === trimmedCourse.toLowerCase(),
      )
    ) {
      setError(m.course_exists());
      return;
    }

    const normalizedGroups = groups.map((g) => ({
      name: g.name.trim(),
      lecturer: g.lecturer.trim(),
      times: g.times,
    }));

    for (const group of normalizedGroups) {
      if (!group.name) {
        setError(m.group_name_required());
        return;
      }
      if (group.times.length === 0) {
        setError(m.group_needs_session());
        return;
      }
      for (const time of group.times) {
        if (time.end <= time.start) {
          setError(m.session_end_after_start());
          return;
        }
      }
    }

    const course: Course = {
      courseName: trimmedCourse,
      subjectCode: subjectCode.trim(),
      groups: normalizedGroups.map((g) => ({
        name: g.name,
        lecturer: g.lecturer,
        times: g.times.map((time) => ({
          day: time.day,
          time: `${formatTimeInput(time.start)}-${formatTimeInput(time.end)}`,
          room: time.room.trim(),
        })),
      })),
      isActive: true,
    };

    onAddCourse(course);
    handleClose();
  };

  const handleBulkAdd = useCallback(() => {
    const raw = bulkText.trim();
    if (!raw) {
      setBulkError(m.bulk_input_empty());
      return;
    }
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";

    const normalize = (value: string) => value.trim();
    const splitRow = (line: string) => line.split(delimiter).map(normalize);

    let startIndex = 0;
    let headerMap: Record<string, number> | null = null;
    const headerCells = splitRow(lines[0]).map((cell) => cell.toLowerCase());
    const headerCandidates = ["course", "course name", "group", "day", "start", "end"];
    if (headerCells.some((cell) => headerCandidates.includes(cell))) {
      headerMap = {};
      for (const [idx, cell] of headerCells.entries()) {
        if (["course", "course name"].includes(cell)) headerMap.course = idx;
        if (["subject", "subject code", "code"].includes(cell)) headerMap.subject = idx;
        if (["group", "group name"].includes(cell)) headerMap.group = idx;
        if (["lecturer", "teacher"].includes(cell)) headerMap.lecturer = idx;
        if (["day", "weekday"].includes(cell)) headerMap.day = idx;
        if (["start", "start time"].includes(cell)) headerMap.start = idx;
        if (["end", "end time"].includes(cell)) headerMap.end = idx;
        if (["room", "location"].includes(cell)) headerMap.room = idx;
      }
      startIndex = 1;
    }

    const courseMap = new Map<string, Course>();
    const existingLower = new Set(
      existingCourseNames.map((name) => name.toLowerCase()),
    );

    for (let i = startIndex; i < lines.length; i += 1) {
      const lineNumber = i + 1;
      const cells = splitRow(lines[i]);
      let course = "";
      let subject = "";
      let group = "";
      let lecturer = "";
      let dayToken = "";
      let startToken = "";
      let endToken = "";
      let room = "";

      if (headerMap) {
        course = cells[headerMap.course ?? -1] ?? "";
        subject = cells[headerMap.subject ?? -1] ?? "";
        group = cells[headerMap.group ?? -1] ?? "";
        lecturer = cells[headerMap.lecturer ?? -1] ?? "";
        dayToken = cells[headerMap.day ?? -1] ?? "";
        startToken = cells[headerMap.start ?? -1] ?? "";
        endToken = cells[headerMap.end ?? -1] ?? "";
        room = cells[headerMap.room ?? -1] ?? "";
      } else if (cells.length >= 8) {
        [course, subject, group, lecturer, dayToken, startToken, endToken, room] = cells;
      } else if (cells.length === 7) {
        [course, subject, group, dayToken, startToken, endToken, room] = cells;
      } else if (cells.length === 6) {
        [course, group, dayToken, startToken, endToken, room] = cells;
      } else {
        setBulkError(m.bulk_input_error_line({ 0: lineNumber, 1: m.bulk_input_invalid_columns() }));
        return;
      }

      if (!course) {
        setBulkError(m.bulk_input_error_line({ 0: lineNumber, 1: m.course_name_required() }));
        return;
      }
      if (!group) {
        setBulkError(m.bulk_input_error_line({ 0: lineNumber, 1: m.group_name_required() }));
        return;
      }
      if (existingLower.has(course.toLowerCase())) {
        setBulkError(m.bulk_input_error_line({ 0: lineNumber, 1: m.course_exists() }));
        return;
      }

      const day = parseDayToken(dayToken);
      if (!day) {
        setBulkError(m.bulk_input_error_line({ 0: lineNumber, 1: m.bulk_input_invalid_day() }));
        return;
      }
      const start = parseTimeToken(startToken);
      const end = parseTimeToken(endToken);
      if (start == null || end == null || end <= start) {
        setBulkError(m.bulk_input_error_line({ 0: lineNumber, 1: m.bulk_input_invalid_time() }));
        return;
      }

      const key = `${course}::${subject}`;
      const entry =
        courseMap.get(key) ??
        ({
          courseName: course,
          subjectCode: subject,
          groups: [],
          isActive: true,
        } satisfies Course);

      let groupEntry = entry.groups.find((g) => g.name === group);
      if (!groupEntry) {
        groupEntry = { name: group, lecturer, times: [] };
        entry.groups.push(groupEntry);
      } else if (!groupEntry.lecturer && lecturer) {
        groupEntry.lecturer = lecturer;
      }

      groupEntry.times.push({
        day,
        time: `${formatTimeInput(start)}-${formatTimeInput(end)}`,
        room,
      });

      courseMap.set(key, entry);
    }

    const parsedCourses = Array.from(courseMap.values());
    if (parsedCourses.length === 0) {
      setBulkError(m.bulk_input_empty());
      return;
    }

    for (const course of parsedCourses) {
      onAddCourse(course);
    }
    setBulkError("");
    setBulkText("");
    handleClose();
  }, [bulkText, existingCourseNames, handleClose, onAddCourse]);

  return (
    <ResponsiveDialog open={open} onClose={handleClose} title={m.add_course_manually()}>
      <div class={styles.body}>
        <p class={styles.helpText}>
          {m.manual_course_help()}
        </p>
        {error && (
          <div class={styles.errorBox}>
            {error}
          </div>
        )}
        <div class={styles.courseFields}>
          <div>
            <label for="manual-course-name" class={styles.label}>
              {m.course_name()}
            </label>
            <input
              id="manual-course-name"
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.currentTarget.value)}
              class={styles.input}
              placeholder={m.example_calculus()}
            />
          </div>
          <div>
            <label for="manual-subject-code" class={styles.label}>
              {m.subject_code()}
            </label>
            <input
              id="manual-subject-code"
              type="text"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.currentTarget.value)}
              class={styles.input}
              placeholder={m.optional()}
            />
          </div>
        </div>

        <div class={styles.groupList}>
          {groups.map((group, gIdx) => (
            <div key={group.id} class={styles.groupCard}>
              <div class={styles.groupHeader}>
                <div class={styles.groupTitle}>
                  {m.group_number({ 0: gIdx + 1 })}
                </div>
                {groups.length > 1 && (
                  <button type="button"
                    onClick={() => removeGroup(gIdx)}
                    class={styles.removeGroupButton}
                  >
                    <Trash2 class={styles.smallIcon} />
                    {m.remove_group()}
                  </button>
                )}
              </div>
              <div class={styles.groupFields}>
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => updateGroup(gIdx, { name: e.currentTarget.value })}
                  class={styles.input}
                  placeholder={m.group_name()}
                />
                <input
                  type="text"
                  value={group.lecturer}
                  onChange={(e) => updateGroup(gIdx, { lecturer: e.currentTarget.value })}
                  class={styles.input}
                  placeholder={m.lecturer()}
                />
              </div>
              <div class={styles.timeList}>
                {group.times.map((time, tIdx) => (
                  <div key={time.id} class={styles.timeRow}>
                    <select
                      value={time.day}
                      onChange={(e) => updateTime(gIdx, tIdx, { day: Number(e.currentTarget.value) as DayNumber })}
                      class={cx(styles.inputSmall, styles.timeDay)}
                    >
                      {([1, 2, 3, 4, 5, 6, 7] as DayNumber[]).map((day) => (
                        <option key={day} value={day}>
                          {localizedDayName(day, locale, "short")}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={formatTimeInput(time.start)}
                      onChange={(e) => {
                        const [h, m] = e.currentTarget.value.split(":").map(Number);
                        updateTime(gIdx, tIdx, { start: h * 60 + m });
                      }}
                      class={styles.inputSmall}
                    />
                    <input
                      type="time"
                      value={formatTimeInput(time.end)}
                      onChange={(e) => {
                        const [h, m] = e.currentTarget.value.split(":").map(Number);
                        updateTime(gIdx, tIdx, { end: h * 60 + m });
                      }}
                      class={styles.inputSmall}
                    />
                    <input
                      type="text"
                      value={time.room}
                      onChange={(e) => updateTime(gIdx, tIdx, { room: e.currentTarget.value })}
                      class={styles.inputSmall}
                      placeholder={m.room()}
                    />
                    {group.times.length > 1 && (
                      <button type="button"
                        onClick={() => removeTime(gIdx, tIdx)}
                        class={styles.removeTimeButton}
                        title={m.remove_session()}
                      >
                        <Trash2 class={styles.smallIcon} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button"
                  onClick={() => addTime(gIdx)}
                  class={styles.addLink}
                >
                  <Plus class={styles.smallIcon} />
                  {m.add_session()}
                </button>
              </div>
            </div>
          ))}
          <button type="button"
            onClick={addGroup}
            class={styles.addLink}
          >
            <Plus class={styles.smallIcon} />
            {m.add_group()}
          </button>
        </div>

        {enableBulkInput && (
          <div class={styles.bulkCard}>
            <div class={styles.bulkHeader}>
              <div class={styles.bulkTitle}>
                {m.bulk_input_title()}
              </div>
              <button type="button"
                onClick={() => {
                  setBulkText("");
                  setBulkError("");
                }}
                class={styles.bulkClear}
              >
                {m.bulk_input_clear()}
              </button>
            </div>
            <p class={styles.bulkDescription}>
              {m.bulk_input_description()}
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.currentTarget.value)}
              rows={4}
              class={cx(styles.inputSmall, styles.bulkTextarea)}
              placeholder={m.bulk_input_placeholder()}
            />
            {bulkError && (
              <div class={styles.errorBox}>
                {bulkError}
              </div>
            )}
            <button type="button"
              onClick={handleBulkAdd}
              class={styles.bulkAddButton}
            >
              {m.bulk_input_add()}
            </button>
          </div>
        )}

        <div class={styles.actions}>
          <button type="button"
            onClick={handleSubmit}
            class={styles.primaryButton}
          >
            {m.add_course()}
          </button>
          <button type="button"
            onClick={handleClose}
            class={styles.secondaryButton}
          >
            {m.cancel()}
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

const styles = {
  body: "space-y-4",
  helpText: "text-xs text-gray-500 dark:text-gray-400",
  errorBox:
    "text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 dark:text-red-400 dark:bg-red-900/20 dark:border-red-700",
  courseFields: "flex flex-col gap-3 sm:flex-row sm:flex-wrap",
  label: "block text-xs font-semibold text-gray-600 mb-1 dark:text-gray-300",
  input:
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
  groupList: "space-y-4",
  groupCard: "border border-gray-200 rounded-lg p-3 space-y-3 dark:border-gray-700",
  groupHeader: "flex items-center justify-between gap-2",
  groupTitle: "text-xs font-semibold text-gray-600 dark:text-gray-300",
  removeGroupButton:
    "flex items-center text-xs text-red-500 transition-colors cursor-pointer gap-1 hover:text-red-600",
  groupFields: "flex flex-col gap-3 sm:flex-row sm:flex-wrap",
  timeList: "space-y-2",
  timeRow: "flex flex-col items-stretch gap-2 sm:flex-row sm:items-center",
  inputSmall:
    "border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 leading-normal min-h-[36px] text-xs bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
  timeDay: "min-w-[110px] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2024%2024%20%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[position:right_0.6rem_center] bg-no-repeat cursor-pointer",
  removeTimeButton: "text-gray-400 transition-colors cursor-pointer hover:text-red-500",
  addLink:
    "flex items-center text-xs text-blue-600 transition-colors cursor-pointer gap-1 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
  smallIcon: "w-3.5 h-3.5",
  bulkCard:
    "border border-dashed border-blue-200 rounded-lg p-3 bg-blue-50/40 space-y-2 dark:border-blue-700 dark:bg-blue-900/10",
  bulkHeader: "flex items-center justify-between gap-2",
  bulkTitle: "text-xs font-semibold text-blue-700 dark:text-blue-300",
  bulkClear:
    "text-[11px] text-blue-600 transition-colors cursor-pointer hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200",
  bulkDescription: "text-xs text-gray-500 dark:text-gray-400",
  bulkTextarea: "w-full font-mono",
  bulkAddButton:
    "text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold transition-colors cursor-pointer hover:bg-blue-700",
  actions: "pt-2 flex flex-col gap-2 sm:flex-row",
  primaryButton:
    "flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold transition-colors cursor-pointer hover:bg-blue-700",
  secondaryButton:
    "flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 transition-colors cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800",
};

