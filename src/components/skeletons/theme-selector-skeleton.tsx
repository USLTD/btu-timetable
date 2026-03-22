const styles = {
  skeleton: "w-24 h-8 bg-gray-200 rounded-md dark:bg-gray-700 animate-pulse",
};

export function ThemeSelectorSkeleton() {
  return <div class={styles.skeleton} />;
}
