import { Download } from "lucide-preact";
import * as m from "@/paraglide/messages";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const styles = {
  button: "px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 transition-colors cursor-pointer hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30",
  icon: "w-3.5 h-3.5 shrink-0",
};

export function PwaInstallClient() {
  const { canInstall, install } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <button type="button" onClick={install} class={styles.button}>
      <Download class={styles.icon} />
      {m.install_app()}
    </button>
  );
}
