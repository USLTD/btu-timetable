import { useEffect } from "preact/hooks";
import { navigate } from "vike/client/router";
import { getPreferredLocale } from "@/lib/i18n";

export default function Page() {
  useEffect(() => {
    const locale = getPreferredLocale();
    const target = `/${locale}`;
    if (typeof window !== "undefined" && window.location.pathname !== target) {
      navigate(target, { overwriteLastHistoryEntry: true }).catch(() => {
        window.location.replace(target);
      });
    }
  }, []);

  return null;
}
