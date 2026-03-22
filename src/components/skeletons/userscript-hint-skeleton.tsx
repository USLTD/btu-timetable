const styles = {
  skeleton: "hidden sm:flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-700",
  icon: "w-4 h-4 bg-gray-300 rounded dark:bg-gray-600 animate-pulse",
  text: "flex-1 h-4 bg-gray-300 rounded dark:bg-gray-600 animate-pulse",
};

export function UserscriptHintSkeleton() {
  return (
    <div class={styles.skeleton}>
      <div class={styles.icon} />
      <div class={styles.text} />
    </div>
  );
}
