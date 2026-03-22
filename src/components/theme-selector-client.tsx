import { Moon, Sun, Monitor } from "lucide-preact";
import * as m from "@/paraglide/messages";
import { type Theme, useTheme } from "@/hooks/use-theme";

const styles = {
  icon: "w-4 h-4 shrink-0",
  wrapper:
    "inline-flex h-8 items-center gap-2 px-3 border border-gray-200 rounded-md text-xs font-medium text-gray-700 bg-transparent transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
  select:
    "h-full bg-transparent border-0 outline-none cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300 pr-5 leading-none",
};

export function ThemeSelectorClient() {
  const { theme, setTheme } = useTheme();

  const themeIcon =
    theme === "dark" ? (
      <Moon class={styles.icon} />
    ) : theme === "light" ? (
      <Sun class={styles.icon} />
    ) : (
      <Monitor class={styles.icon} />
    );

  return (
    <div class={styles.wrapper}>
      {themeIcon}
      <select
        value={theme}
        onChange={(e) => {
          const newTheme = e.currentTarget.value as Theme;
          setTheme(newTheme);
        }}
        class={styles.select}
        title={m.toggle_theme()}
        aria-label={m.toggle_theme()}
      >
        <option value="system">{m.theme_system()}</option>
        <option value="light">{m.theme_light()}</option>
        <option value="dark">{m.theme_dark()}</option>
      </select>
    </div>
  );
}
