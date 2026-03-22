import { useHydration } from "@/contexts/hydration-context";

const styles = {
  overlay: "fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900 transition-opacity duration-300",
  container: "text-center",
  spinner: "w-8 h-8 mx-auto mb-4 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin",
  text: "text-sm text-gray-600 dark:text-gray-400",
  logo: "w-8 h-8 mx-auto mb-4 text-blue-600",
};

export function HydrationIndicator() {
  const { isLoading } = useHydration();

  if (!isLoading) return null;

  return (
    <div class={styles.overlay}>
      <div class={styles.container}>
        <div class={styles.spinner} />
        <div class={styles.text}>
          Loading application...
        </div>
      </div>
    </div>
  );
}
