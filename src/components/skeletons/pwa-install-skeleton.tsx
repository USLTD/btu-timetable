const styles = {
  skeleton: "w-10 h-10 bg-gray-200 rounded-lg dark:bg-gray-700 animate-pulse",
};

export function PwaInstallSkeleton() {
  return <div class={styles.skeleton} />;
}
