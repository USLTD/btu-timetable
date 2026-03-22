import { navigate } from "vike/client/router";
import { usePageContext } from "@/renderer/usePageContext";
import { useLocale } from "@/lib/i18n";
import * as m from "@/paraglide/messages";

export default function Page() {
  const { is404, urlPathname } = usePageContext();
  const locale = useLocale();
  const path =
    urlPathname ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const status = is404 ? "404" : "500";

  return (
    <div class={styles.page}>
      <div class={styles.card}>
        <div class={styles.headerRow}>
          <div class={styles.statusBadge}>
            {status}
          </div>
          <div class={styles.headerText}>
            <h1 class={styles.title}>
              {is404 ? m.error_not_found_title() : m.error_server_error_title()}
            </h1>
            <p class={styles.subtitle}>
              {is404 ? m.error_not_found_description() : m.error_server_error_description()}
            </p>
          </div>
        </div>

        <div class={styles.pathCard}>
          <div class={styles.pathLabel}>
            {m.error_requested_path_label()}
          </div>
          <code class={styles.pathValue}>
            {path || "/"}
          </code>
        </div>

        <div class={styles.actions}>
          <button
            type="button"
            onClick={() => navigate(`/${locale}`)}
            class={styles.primaryButton}
          >
            {m.go_to_home()}
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.history.back();
            }}
            class={styles.secondaryButton}
          >
            {m.go_back()}
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            class={styles.tertiaryButton}
          >
            {m.reload()}
          </button>
        </div>

        <p class={styles.footerNote}>
          {is404 ? m.error_not_found_help() : m.error_server_error_help()}
        </p>
      </div>
    </div>
  );
}

const styles = {
  page:
    "min-h-screen flex items-center justify-center p-6 text-gray-800 bg-[linear-gradient(135deg,#f8fafc,#ffffff,#eff6ff)] dark:text-gray-100 dark:bg-[linear-gradient(135deg,#030712,#111827,#172554)]",
  card:
    "w-full max-w-3xl rounded-2xl p-6 border border-gray-200 bg-white/90 shadow-xl backdrop-blur-[12px] space-y-6 dark:border-gray-700 dark:bg-gray-900/80 sm:p-10",
  headerRow: "flex flex-col gap-4 sm:flex-row sm:items-center",
  statusBadge:
    "shrink-0 w-14 h-14 inline-flex items-center justify-center rounded-2xl bg-blue-600 text-white text-xl font-bold shadow-lg",
  headerText: "min-w-0",
  title: "text-2xl font-bold sm:text-3xl",
  subtitle: "mt-2 text-gray-600 dark:text-gray-300",
  pathCard:
    "rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 space-y-1.5 dark:border-blue-800 dark:bg-blue-950/40",
  pathLabel: "text-xs uppercase tracking-[0.08em] font-semibold text-blue-600 dark:text-blue-300",
  pathValue: "text-sm break-all text-blue-900 dark:text-blue-100 sm:text-base",
  actions: "flex flex-wrap gap-2",
  primaryButton:
    "px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold transition-colors cursor-pointer hover:bg-blue-700",
  secondaryButton:
    "px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold transition-colors cursor-pointer hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
  tertiaryButton:
    "px-4 py-2 rounded-lg border border-gray-200 text-gray-800 text-sm font-semibold transition-colors cursor-pointer hover:border-blue-300 dark:border-gray-700 dark:text-gray-100 dark:hover:border-blue-500",
  footerNote: "mt-6 text-xs text-gray-500 dark:text-gray-400",
};
