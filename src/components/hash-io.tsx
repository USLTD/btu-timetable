import { Check, Copy, Import } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import * as m from "@/paraglide/messages";
import { copyToClipboard } from "@/lib/clipboard";
import { cx } from "@/lib/cx";

interface HashIOProps {
  showImport: boolean;
  setShowImport: (show: boolean) => void;
  importText: string;
  setImportText: (text: string) => void;
  exportHash: string;
  setExportHash: (hash: string) => void;
  onImport: () => void;
  onExport: () => void;
}

export function HashIO({
  showImport,
  setShowImport,
  importText,
  setImportText,
  exportHash,
  setExportHash,
  onImport,
  onExport,
}: HashIOProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    if (!exportHash) return;
    await copyToClipboard(exportHash);
    setCopied(true);
  };

  return (
    <div class={styles.wrap}>
      <div class={styles.buttonRow}>
        <button
          type="button"
          onClick={() => {
            setShowImport(!showImport);
            setExportHash("");
          }}
          class={styles.actionButton}
        >
          <Import class={styles.icon} />
          {m.import_hash()}
        </button>
        <button
          type="button"
          onClick={onExport}
          class={styles.actionButton}
        >
          <Copy class={styles.icon} />
          {m.export_hash()}
        </button>
      </div>

      {showImport && (
        <div class={styles.ioRow}>
          <input
            type="text"
            value={importText}
            onChange={(e) => setImportText(e.currentTarget.value)}
            placeholder={m.paste_shared_hash_here()}
            class={styles.input}
            maxLength={10000}
          />
          <button
            type="button"
            onClick={onImport}
            disabled={!importText.trim()}
            class={styles.applyButton}
          >
            {m.apply_hash()}
          </button>
        </div>
      )}

      {exportHash && (
        <div class={styles.ioRow}>
          <input
            type="text"
            readOnly
            value={exportHash}
            onClick={handleCopy}
            class={styles.exportInput}
            title={m.click_to_copy()}
          />
          <span
            class={cx(
              styles.copiedIndicator,
              copied ? styles.copiedVisible : styles.copiedHidden,
            )}
          >
            {copied ? <Check class={styles.copiedIcon} /> : null}
            {m.copied()}
          </span>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: "mb-3 flex flex-col gap-2 no-print",
  buttonRow: "flex flex-wrap items-center gap-2",
  actionButton:
    "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
  icon: "w-4 h-4",
  ioRow: "flex items-center gap-2",
  input:
    "flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
  applyButton:
    "px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium transition-colors cursor-pointer hover:bg-blue-700 disabled:opacity-50",
  exportInput:
    "flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-gray-50 text-gray-800 shadow-sm cursor-pointer select-all font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200",
  copiedIndicator: "text-xs transition-opacity transition-colors flex items-center gap-1",
  copiedVisible: "opacity-100 text-green-500",
  copiedHidden: "opacity-0 text-gray-400",
  copiedIcon: "w-3 h-3",
};
