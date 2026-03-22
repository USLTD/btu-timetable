import { UploadCloud, PlusCircle } from "lucide-preact";
import { useRef } from "preact/hooks";
import * as m from "@/paraglide/messages";
import { cx } from "@/lib/cx";

interface FileUploadProps {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onFiles: (files: FileList) => void;
  onOpenManualCourseDialog: () => void;
  hasCourses?: boolean;
}

export function FileUpload({
  isDragging,
  setIsDragging,
  onFiles,
  onOpenManualCourseDialog,
  hasCourses,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        id="fileUpload"
        multiple
        accept=".html,.htm,.json,.csv,.md"
        class={styles.hiddenInput}
        onChange={(e) => { if ((e.currentTarget as HTMLInputElement).files) onFiles((e.currentTarget as HTMLInputElement).files!); }}
      />
      <div class={styles.relative}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false);    if (e.dataTransfer?.files) {
      onFiles(e.dataTransfer.files);
    }}}
          class={cx(
            styles.dropzone,
            isDragging ? styles.dropzoneActive : styles.dropzoneIdle
          )}
          aria-label={m.click_to_upload_or_drag_drop_schedule_files()}
        >
          <UploadCloud class={styles.icon} />
          <p class={styles.title}>{m.click_to_upload_or_drag_drop_schedule_files()}</p>
          <p class={styles.subtitle}>{m.upload_supported_formats()}</p>
        </button>
      </div>

      <div class={styles.manualAddRow}>
        <button
          type="button"
          onClick={onOpenManualCourseDialog}
          class={styles.manualAddButton}
        >
          <PlusCircle class={styles.manualAddIcon} />
          {m.add_course_manually()}
        </button>
      </div>

      {/* How it works — only show when no courses loaded */}
      {!hasCourses && (
        <div class={styles.steps}>
          <div class={styles.stepCard}>
            <span class={styles.stepBadge}>1</span>
            <span class={styles.stepTitle}>{m.export_from_btu()}</span>
            <span class={styles.stepSubtitle}>{m.save_the_timetable_page_as_html()}</span>
          </div>
          <div class={styles.stepCard}>
            <span class={styles.stepBadge}>2</span>
            <span class={styles.stepTitle}>{m.upload_here()}</span>
            <span class={styles.stepSubtitle}>{m.drop_the_file_above_or_click_to_browse()}</span>
          </div>
          <div class={styles.stepCard}>
            <span class={styles.stepBadge}>3</span>
            <span class={styles.stepTitle}>{m.get_your_schedule()}</span>
            <span class={styles.stepSubtitle}>{m.we_ll_find_the_optimal_combination()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  hiddenInput: "hidden",
  relative: "relative",
  dropzone:
    "w-full border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors sm:p-8",
  dropzoneActive: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
  dropzoneIdle:
    "border-gray-300 bg-gray-50 hover:border-blue-400 dark:border-gray-600 dark:bg-gray-800",
  icon: "w-8 h-8 mx-auto mb-3 text-gray-400 dark:text-gray-400 sm:w-12 sm:h-12",
  title: "font-medium text-gray-700 dark:text-gray-200",
  subtitle: "mt-1 text-sm text-gray-400 dark:text-gray-400",
  steps: "mt-4 text-center flex flex-col gap-3 sm:flex-row sm:flex-wrap",
  stepCard:
    "flex-1 min-w-[12rem] flex flex-col items-center p-3 rounded-lg bg-gray-50 space-y-1.5 dark:bg-gray-800/50",
  stepBadge:
    "w-7 h-7 rounded-full inline-flex items-center justify-center bg-blue-100 text-blue-600 text-sm font-bold dark:bg-blue-900/40 dark:text-blue-400",
  stepTitle: "text-sm font-medium text-gray-700 dark:text-gray-300",
  stepSubtitle: "text-xs text-gray-400 dark:text-gray-400",
  manualAddRow: "mt-3 flex justify-center",
  manualAddButton:
    "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg transition-colors hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20",
  manualAddIcon: "w-4 h-4",
};
