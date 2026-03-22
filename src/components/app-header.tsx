import { Calendar as CalendarIcon } from "lucide-preact";
import * as m from "@/paraglide/messages";
import { localeNames, setLocaleAndPersist, useLocale } from "@/lib/i18n";
import type { Locale } from "@/types/i18n";
import { cx } from "@/lib/cx";
import { ClientOnly } from "@/components/client-only";
import { ThemeSelectorClient } from "@/components/theme-selector-client";
import { ThemeSelectorSkeleton } from "@/components/skeletons/theme-selector-skeleton";

const styles = {
  headerTop: "flex flex-col sm:flex-row flex-wrap gap-4 sm:items-center justify-between w-full xl:w-auto",
  title: "flex items-center gap-2 text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-50",
  titleIcon: "w-6 h-6 text-blue-600 shrink-0",
  headerControls: "flex w-full sm:w-auto items-center flex-nowrap gap-2 mt-2 sm:mt-0",
  headerSelect:
    "h-8 px-3 bg-transparent border border-gray-200 rounded-md text-xs font-medium text-gray-700 outline-none transition-colors cursor-pointer hover:bg-gray-50 leading-none dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
};

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  const locale = useLocale();

  return (
    <div class={cx(styles.headerTop, className)}>
      <h1 class={styles.title}>
        <CalendarIcon class={styles.titleIcon} />
        {m.ultimate_schedule_optimizer()}
      </h1>
      <div class={styles.headerControls}>
        <select
          value={locale}
          onChange={(e) =>
            void setLocaleAndPersist(e.currentTarget.value as Locale)
          }
          class={styles.headerSelect}
          title={m.language()}
          aria-label={m.choose_language()}
        >
          {Object.entries(localeNames).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <ClientOnly skeleton={<ThemeSelectorSkeleton />}>
          <ThemeSelectorClient />
        </ClientOnly>
      </div>
    </div>
  );
}
