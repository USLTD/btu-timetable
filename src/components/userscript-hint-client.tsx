import { useState, useEffect } from "preact/hooks";
import { Puzzle, X } from "lucide-preact";
import * as m from "@/paraglide/messages";

const styles = {
  userscriptHint:
    "hidden sm:flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300",
  userscriptIcon: "w-4 h-4 shrink-0",
  userscriptText: "flex-1",
  userscriptLink: "underline hover:no-underline",
  userscriptDismiss: "p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors",
  userscriptDismissIcon: "w-4 h-4",
};

export function UserscriptHintClient() {
  const [showUserscriptHint, setShowUserscriptHint] = useState(() => {
    // Only access localStorage and window on client side
    if (typeof window === "undefined") return true;
    const manuallyDismissed =
      localStorage.getItem("dismissed-userscript-hint") === "1";
    const userscriptActive = !!window.__BTU_USERSCRIPT_ACTIVE;
    return !manuallyDismissed && !userscriptActive;
  });

  const dismiss = () => {
    setShowUserscriptHint(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("dismissed-userscript-hint", "1");
    }
  };

  useEffect(() => {
    const handleDetected = () => setShowUserscriptHint(false);
    window.addEventListener("btu-userscript-detected", handleDetected);

    if (typeof window !== "undefined" && window.__BTU_USERSCRIPT_ACTIVE) {
      setShowUserscriptHint(false);
    }

    return () => {
      window.removeEventListener("btu-userscript-detected", handleDetected);
    };
  }, []);

  if (!showUserscriptHint) return null;

  return (
    <div class={styles.userscriptHint}>
      <Puzzle class={styles.userscriptIcon} />
      <span class={styles.userscriptText}>
        {m.tip_install_the()}{" "}
        <a
          href="https://userscripts.usltd.ge/btu-timetable-helper.user.js"
          target="_blank"
          rel="noopener noreferrer"
          class={styles.userscriptLink}
        >
          {m.btu_helper_userscript()}
        </a>{" "}
        {m.userscript_export_hint()}
      </span>
      <button
        type="button"
        onClick={dismiss}
        class={styles.userscriptDismiss}
        aria-label={m.dismiss()}
      >
        <X class={styles.userscriptDismissIcon} />
      </button>
    </div>
  );
}
