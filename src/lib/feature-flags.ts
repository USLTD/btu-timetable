import { useSyncExternalStore } from "@/hooks/use-sync-external-store";
import * as m from "@/paraglide/messages";

export type FeatureFlagKey =
  | "protobuf-backup"
  | "protobuf-legacy-v2"
  | "protobuf-file-io"
  | "merge-temporary-exclude"
  | "quick-duplicate-course"
  | "preset-week-templates"
  | "conflict-heatmap"
  | "summary-report-export"
  | "bulk-manual-input"
  | "schedule-diff-summary"
  | "backup-history"
  | "lecturer-ratings"
  | "mock-data"
  | "mock-lecturer-ratings"
  | "schedule-diff-overlay"
  | "schedule-similar-diff"
  | "filter-lecturers-rating"
  | "diff-fab"
  | "auto-georgianization";

export type FlagCategory = "Data & Sync" | "UI & Polish" | "Experimental" | "Integrations";

export interface FeatureFlag {
  key: FeatureFlagKey;
  category: FlagCategory;
  title: () => string;
  description: () => string;
  default: boolean;
  dependsOn?: FeatureFlagKey | FeatureFlagKey[];
}

const STORAGE_KEY = "app-feature-flags";

const FLAGS: FeatureFlag[] = [
  {
    key: "protobuf-backup",
    category: "Data & Sync",
    title: () => m.flag_protobuf_backup_title(),
    description: () => m.flag_protobuf_backup_description(),
    default: false,
  },
  {
    key: "protobuf-legacy-v2",
    category: "Data & Sync",
    title: () => m.flag_protobuf_legacy_title(),
    description: () => m.flag_protobuf_legacy_description(),
    default: false,
    dependsOn: "protobuf-backup",
  },
  {
    key: "protobuf-file-io",
    category: "Data & Sync",
    title: () => m.flag_protobuf_file_io_title(),
    description: () => m.flag_protobuf_file_io_description(),
    default: false,
    dependsOn: "protobuf-backup",
  },
  {
    key: "backup-history",
    category: "Data & Sync",
    title: () => m.flag_backup_history_title(),
    description: () => m.flag_backup_history_description(),
    default: false,
  },
  {
    key: "merge-temporary-exclude",
    category: "UI & Polish",
    title: () => m.flag_merge_temporary_exclude_title(),
    description: () => m.flag_merge_temporary_exclude_description(),
    default: false,
  },
  {
    key: "quick-duplicate-course",
    category: "UI & Polish",
    title: () => m.flag_quick_duplicate_course_title(),
    description: () => m.flag_quick_duplicate_course_description(),
    default: false,
  },
  {
    key: "preset-week-templates",
    category: "UI & Polish",
    title: () => m.flag_preset_week_templates_title(),
    description: () => m.flag_preset_week_templates_description(),
    default: false,
  },
  {
    key: "bulk-manual-input",
    category: "UI & Polish",
    title: () => m.flag_bulk_manual_input_title(),
    description: () => m.flag_bulk_manual_input_description(),
    default: false,
  },
  {
    key: "diff-fab",
    category: "UI & Polish",
    title: () => m.flag_diff_fab_title(),
    description: () => m.flag_diff_fab_description(),
    default: false,
  },
  {
    key: "conflict-heatmap",
    category: "Experimental",
    title: () => m.flag_conflict_heatmap_title(),
    description: () => m.flag_conflict_heatmap_description(),
    default: false,
  },
  {
    key: "summary-report-export",
    category: "Experimental",
    title: () => m.flag_summary_report_export_title(),
    description: () => m.flag_summary_report_export_description(),
    default: false,
  },
  {
    key: "schedule-diff-summary",
    category: "Experimental",
    title: () => m.flag_schedule_diff_summary_title(),
    description: () => m.flag_schedule_diff_summary_description(),
    default: false,
  },
  {
    key: "schedule-diff-overlay",
    category: "Experimental",
    title: () => m.flag_schedule_diff_overlay_title(),
    description: () => m.flag_schedule_diff_overlay_description(),
    default: false,
  },
  {
    key: "schedule-similar-diff",
    category: "Experimental",
    title: () => m.flag_schedule_similar_diff_title(),
    description: () => m.flag_schedule_similar_diff_description(),
    default: false,
    dependsOn: "schedule-diff-overlay",
  },
  {
    key: "mock-data",
    category: "Experimental",
    title: () => m.flag_mock_data_title(),
    description: () => m.flag_mock_data_description(),
    default: false,
  },
  {
    key: "lecturer-ratings",
    category: "Integrations",
    title: () => m.flag_lecturer_ratings_title(),
    description: () => m.flag_lecturer_ratings_description(),
    default: false,
  },
  {
    key: "mock-lecturer-ratings",
    category: "Integrations",
    title: () => m.flag_mock_lecturer_ratings_title(),
    description: () => m.flag_mock_lecturer_ratings_description(),
    default: false,
    dependsOn: ["lecturer-ratings", "mock-data"],
  },
  {
    key: "filter-lecturers-rating",
    category: "Integrations",
    title: () => m.flag_filter_lecturers_rating_title(),
    description: () => m.flag_filter_lecturers_rating_description(),
    default: false,
    dependsOn: "lecturer-ratings",
  },
  {
    key: "auto-georgianization",
    category: "Integrations",
    title: () => m.flag_auto_georgianization_title(),
    description: () => m.flag_auto_georgianization_description(),
    default: false,
    dependsOn: "lecturer-ratings",
  },
];

const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function loadOverrides(): Record<string, boolean> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Record<string, boolean>) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch {
    /* ignore */
  }
}

function buildRawFlags(overrides: Record<string, boolean>) {
  const result: Record<FeatureFlagKey, boolean> = {} as Record<FeatureFlagKey, boolean>;
  for (const flag of FLAGS) {
    const raw = overrides[flag.key];
    result[flag.key] = raw ?? flag.default;
  }
  return result;
}

function applyDependencies(
  rawFlags: Record<FeatureFlagKey, boolean>,
) {
  const result = { ...rawFlags };
  for (const flag of FLAGS) {
    const deps = Array.isArray(flag.dependsOn)
      ? flag.dependsOn
      : flag.dependsOn
        ? [flag.dependsOn]
        : [];
    if (deps.some((dep) => !result[dep])) {
      result[flag.key] = false;
    }
  }
  return result;
}

function notify() {
  for (const listener of listeners) listener();
}

export function getFlagRegistry() {
  return FLAGS;
}

export function getEffectiveFlags() {
  const overrides = loadOverrides();
  const rawFlags = buildRawFlags(overrides);
  return applyDependencies(rawFlags);
}

export function getRawFlags() {
  return buildRawFlags(loadOverrides());
}

export function setFlag(key: FeatureFlagKey, value: boolean) {
  const overrides = loadOverrides();
  overrides[key] = value;
  saveOverrides(overrides);
  notify();
}

export function resetFlags() {
  saveOverrides({});
  notify();
}

export function useFeatureFlags() {
  const subscribe = (onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
    };
    if (isBrowser()) {
      window.addEventListener("storage", handler);
    }
    return () => {
      listeners.delete(onStoreChange);
      if (isBrowser()) {
        window.removeEventListener("storage", handler);
      }
    };
  };

  const getSnapshot = () => {
    const overrides = loadOverrides();
    const rawFlags = buildRawFlags(overrides);
    const effectiveFlags = applyDependencies(rawFlags);
    return { rawFlags, effectiveFlags };
  };

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    flags: snapshot.effectiveFlags,
    rawFlags: snapshot.rawFlags,
    registry: FLAGS,
    setFlag,
    resetFlags,
  };
}

export function isFlagEnabled(
  key: FeatureFlagKey,
  flags?: Record<FeatureFlagKey, boolean>,
) {
  const current = flags ?? getEffectiveFlags();
  return !!current[key];
}
