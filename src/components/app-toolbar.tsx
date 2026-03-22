import {
  Check,
  Flag,
  MoreHorizontal,
  Puzzle,
  Printer,
  Redo2,
  Share2,
  Undo2,
} from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ClientOnly } from "@/components/client-only";
import { PwaInstallClient } from "@/components/pwa-install-client";
import { PwaInstallSkeleton } from "@/components/skeletons/pwa-install-skeleton";
import * as m from "@/paraglide/messages";
import { cx } from "@/lib/cx";

const styles = {
  toolbarActions: "flex flex-wrap items-center justify-start xl:justify-end gap-2 w-full xl:w-auto",
  iconButton: "p-2 rounded-lg transition-colors",
  iconButtonMuted: "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700",
  iconButtonPrimary: "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30",
  iconButtonSuccess: "text-green-500 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30",
  icon: "w-4 h-4",
  mobileMenuWrap: "relative sm:hidden",
  mobileMenu:
    "absolute right-0 top-full mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-1 dark:border-gray-700 dark:bg-gray-800",
  mobileMenuButton:
    "w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700",
};

interface AppToolbarProps {
  shared: boolean;
  onShare: () => void;
  onPrint: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onShowFeatureFlags: () => void;
  className?: string;
}

export function AppToolbar({
  shared,
  onShare,
  onPrint,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShowFeatureFlags,
  className,
}: AppToolbarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <div class={cx(styles.toolbarActions, className)}>
      <ClientOnly skeleton={<PwaInstallSkeleton />}>
        <PwaInstallClient />
      </ClientOnly>
      <button
        type="button"
        onClick={onShare}
        title={shared ? m.link_copied() : m.share_copy_url()}
        aria-label={m.share_settings()}
        class={cx(
          styles.iconButton,
          shared ? styles.iconButtonSuccess : styles.iconButtonMuted,
        )}
      >
        {shared ? (
          <Check class={styles.icon} />
        ) : (
          <Share2 class={styles.icon} />
        )}
      </button>
      <button
        type="button"
        onClick={onPrint}
        title={m.print_schedule()}
        aria-label={m.print_schedule()}
        class={cx(
          styles.iconButton,
          styles.iconButtonMuted,
          "hidden sm:inline-flex",
          "no-print",
        )}
      >
        <Printer class={styles.icon} />
      </button>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title={m.undo_ctrl_z()}
        class={cx(
          styles.iconButton,
          styles.iconButtonMuted,
          "hidden sm:inline-flex",
          "no-print",
        )}
        aria-label={m.undo()}
      >
        <Undo2 class={styles.icon} />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title={m.redo_ctrl_y()}
        class={cx(
          styles.iconButton,
          styles.iconButtonMuted,
          "hidden sm:inline-flex",
          "no-print",
        )}
        aria-label={m.redo()}
      >
        <Redo2 class={styles.icon} />
      </button>

      <div class={styles.mobileMenuWrap} ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowMenu((prev) => !prev)}
          aria-label={m.more_options()}
          class={cx(styles.iconButton, styles.iconButtonMuted)}
        >
          <MoreHorizontal class={styles.icon} />
        </button>
        {showMenu && (
          <div class={styles.mobileMenu}>
            <button
              type="button"
              onClick={() => { onUndo(); setShowMenu(false); }}
              disabled={!canUndo}
              class={styles.mobileMenuButton}
            >
              <Undo2 class={styles.icon} /> {m.undo()}
            </button>
            <button
              type="button"
              onClick={() => { onRedo(); setShowMenu(false); }}
              disabled={!canRedo}
              class={styles.mobileMenuButton}
            >
              <Redo2 class={styles.icon} /> {m.redo()}
            </button>
            <button
              type="button"
              onClick={() => { onPrint(); setShowMenu(false); }}
              class={styles.mobileMenuButton}
            >
              <Printer class={styles.icon} /> {m.print()}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          window.open(
            "https://userscripts.usltd.ge/btu-timetable-helper.user.js",
            "_blank",
          )
        }
        title={m.btu_helper_userscript()}
        aria-label={m.btu_helper_userscript()}
        class={cx(styles.iconButton, styles.iconButtonMuted)}
      >
        <Puzzle class={styles.icon} />
      </button>
      <button
        type="button"
        onClick={onShowFeatureFlags}
        title={m.experimental_flags()}
        aria-label={m.experimental_flags()}
        class={cx(styles.iconButton, styles.iconButtonMuted)}
      >
        <Flag class={styles.icon} />
      </button>
    </div>
  );
}
