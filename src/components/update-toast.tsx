import { RefreshCw, X } from "lucide-preact";
import * as m from "@/paraglide/messages";
import { usePwaUpdate } from "@/hooks/use-pwa-update";
import { cx } from "@/lib/cx";

export function UpdateToast() {
    const { needsRefresh, applyUpdate, dismiss } = usePwaUpdate();
    if (!needsRefresh) return null;

    return (
        <div
            role="alert"
            class={cx(styles.toast, "animate-slide-up")}
        >
            <RefreshCw class={cx(styles.icon, "animate-spin-slow")} />
            <div class={styles.content}>
                <p class={styles.title}>{m.update_available()}</p>
                <p class={styles.subtitle}>{m.a_new_version_is_ready_reload_to_update()}</p>
            </div>
            <button type="button"
                onClick={applyUpdate}
                class={styles.primaryButton}
                aria-label={m.reload()}
            >
                {m.reload()}
            </button>
            <button type="button"
                onClick={dismiss}
                class={styles.dismissButton}
                aria-label={m.dismiss()}
            >
                <X class={styles.dismissIcon} />
            </button>
        </div>
    );
}

const styles = {
  toast:
    "fixed bottom-4 right-4 z-50 max-w-sm flex items-center gap-3 p-4 rounded-xl bg-blue-600 text-white shadow-lg",
  icon: "w-5 h-5 shrink-0",
  content: "flex-1 text-sm",
  title: "font-semibold",
  subtitle: "text-xs text-blue-100",
  primaryButton:
    "py-1.5 px-3 rounded-lg bg-white text-blue-600 text-sm font-semibold transition-colors hover:bg-blue-50 cursor-pointer",
  dismissButton: "p-1 text-blue-200 transition-colors hover:text-white cursor-pointer",
  dismissIcon: "w-4 h-4",
};

