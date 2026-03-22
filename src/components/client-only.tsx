import { useState, useEffect } from "preact/hooks";
import { useHydration } from "@/contexts/hydration-context";

interface ClientOnlyProps {
  children: preact.ComponentChildren;
  fallback?: preact.ComponentChildren;
  skeleton?: preact.ComponentChildren;
  delay?: number;
}

const styles = {
  wrapper: "relative",
  content: "transition-opacity duration-300 ease-in-out",
  loading: "opacity-0",
  ready: "opacity-100",
  skeleton: "animate-pulse",
};

export function ClientOnly({ 
  children, 
  fallback = null, 
  skeleton = null, 
  delay = 0 
}: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const { isHydrated } = useHydration();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClient(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (isClient && isHydrated) {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isClient, isHydrated]);

  // Show skeleton during hydration
  if (!isClient || !isHydrated) {
    if (skeleton) {
      return (
        <div class={styles.wrapper}>
          <div class={`${styles.content} ${styles.loading}`}>
            {skeleton}
          </div>
        </div>
      );
    }
    return fallback;
  }

  // Show content with smooth transition
  return (
    <div class={styles.wrapper}>
      <div class={`${styles.content} ${showContent ? styles.ready : styles.loading}`}>
        {children}
      </div>
    </div>
  );
}
