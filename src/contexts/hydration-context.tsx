import { createContext } from "preact";
import { useContext, useState, useEffect } from "preact/hooks";

interface HydrationContextType {
  isHydrated: boolean;
  isLoading: boolean;
}

const HydrationContext = createContext<HydrationContextType>({
  isHydrated: false,
  isLoading: true,
});

export function HydrationProvider({ children }: { children: preact.ComponentChildren }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple hydration check - no fake progress
    const timer = setTimeout(() => {
      setIsHydrated(true);
      setIsLoading(false);
    }, 100); // Small delay to ensure hydration is complete

    return () => clearTimeout(timer);
  }, []);

  return (
    <HydrationContext.Provider value={{ isHydrated, isLoading }}>
      {children}
    </HydrationContext.Provider>
  );
}

export function useHydration() {
  return useContext(HydrationContext);
}
