import { useMemo, useState } from "preact/hooks";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { useFeatureFlags } from "@/lib/feature-flags";
import * as m from "@/paraglide/messages";

interface FeatureFlagsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FeatureFlagsDialog({ open, onClose }: FeatureFlagsDialogProps) {
  const { flags, rawFlags, registry, setFlag, resetFlags } = useFeatureFlags();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registry;
    return registry.filter(
      (flag) =>
        flag.key.includes(q) ||
        flag.title().toLowerCase().includes(q) ||
        flag.description().toLowerCase().includes(q) ||
        flag.category.toLowerCase().includes(q),
    );
  }, [query, registry]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof registry[0][]>();
    for (const flag of filtered) {
      if (!map.has(flag.category)) map.set(flag.category, []);
      map.get(flag.category)!.push(flag);
    }
    const order = ["Data & Sync", "UI & Polish", "Integrations", "Experimental"];
    return Array.from(map.entries()).sort((a, b) => {
      const idxA = order.indexOf(a[0]);
      const idxB = order.indexOf(b[0]);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
  }, [filtered]);

  return (
    <ResponsiveDialog open={open} onClose={onClose} title={m.experimental_flags_title()}>
      <div class={styles.wrap}>
        <p class={styles.subtitle}>
          {m.experimental_flags_desc()}
        </p>
        <div class={styles.searchRow}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder={m.search_flags()}
            class={styles.searchInput}
          />
          <button
            type="button"
            onClick={resetFlags}
            class={styles.resetButton}
          >
            {m.reset_to_defaults()}
          </button>
        </div>
        <div class={styles.list}>
          {grouped.map(([category, sectionFlags]) => (
            <div key={category} class={styles.section}>
              <h4 class={styles.sectionTitle}>{category}</h4>
              <div class={styles.sectionList}>
                {sectionFlags.map((flag) => {
                  const enabled = rawFlags[flag.key];
                  const dependsOn = Array.isArray(flag.dependsOn)
                    ? flag.dependsOn
                    : flag.dependsOn
                      ? [flag.dependsOn]
                      : [];
                  const blocked = dependsOn.some((dep) => !flags[dep]);
                  return (
                    <div
                      key={flag.key}
                      class={styles.item}
                      style={{ contentVisibility: "auto", containIntrinsicSize: "120px 120px" }}
                    >
                      <div class={styles.itemBody}>
                        <div class={styles.itemHeader}>
                          <span class={styles.itemTitle}>
                            {flag.title()}
                          </span>
                          <span class={styles.itemKey}>
                            {flag.key}
                          </span>
                        </div>
                        <p class={styles.itemDesc}>
                          {flag.description()}
                        </p>
                        {dependsOn.length > 0 && (
                          <p class={blocked ? styles.itemBlocked : styles.itemDepends}>
                            {m.flags_requires()}{" "}
                            <span class={styles.itemBlockedCode}>{dependsOn.join(", ")}</span>
                          </p>
                        )}
                      </div>
                      <label class={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={blocked}
                          onChange={(e) => setFlag(flag.key, e.currentTarget.checked)}
                          class={styles.checkbox}
                        />
                        <span class={styles.toggleLabel}>
                          {enabled ? m.flag_toggle_on() : m.flag_toggle_off()}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p class={styles.empty}>
              {m.no_flags_match_search()}
            </p>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}

const styles = {
  wrap: "flex flex-col gap-4 min-h-0",
  subtitle: "text-xs text-gray-500 dark:text-gray-400",
  searchRow: "flex flex-col gap-2 sm:flex-row sm:items-center",
  searchInput:
    "flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
  resetButton:
    "px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 transition-colors cursor-pointer hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-500",
  list: "space-y-6 flex-1 min-h-0 pr-0 sm:pr-1 overflow-y-auto pb-4",
  section: "space-y-2.5",
  sectionTitle: "text-[11px] font-bold uppercase tracking-wider text-gray-500 pl-1 dark:text-gray-400",
  sectionList: "space-y-2.5",
  item: "border border-gray-200 rounded-lg p-3 flex items-start gap-3 bg-white dark:bg-gray-800/40 dark:border-gray-700",
  itemBody: "flex-1 min-w-0 space-y-1",
  itemHeader: "flex items-center gap-2",
  itemTitle: "text-sm font-semibold text-gray-800 dark:text-gray-100",
  itemKey: "text-[10px] tracking-wide text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-mono dark:bg-gray-700/50 dark:text-gray-400",
  itemDesc: "text-xs text-gray-500 mt-1 dark:text-gray-400",
  itemDepends: "text-[11px] mt-1 text-gray-500 dark:text-gray-400",
  itemBlocked: "text-[11px] mt-1 text-amber-500",
  itemBlockedCode: "font-mono",
  itemBlockedNote: "ml-2 text-[10px] uppercase tracking-wide",
  toggle: "inline-flex items-center gap-2 shrink-0",
  checkbox: "w-4 h-4",
  toggleLabel: "text-xs text-gray-500 dark:text-gray-400",
  empty: "text-sm text-gray-500 dark:text-gray-400",
};
