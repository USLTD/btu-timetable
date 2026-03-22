import { createContext } from "preact";
import { useCallback, useContext, useMemo, useRef } from "preact/hooks";
import { useFeatureFlags } from "@/lib/feature-flags";
import {
  LecturerRatingsClient,
  getMockLecturerRating,
  normalizeLecturerName,
  type LecturerRating,
} from "@/lib/lecturer-ratings";

// --- Public interface ---

export interface DataService {
  /** Fetch lecturer rating — transparently routes to mock or real backend */
  fetchLecturerRating(name: string): Promise<LecturerRating | null>;
  /** Whether the data service is in mock mode */
  isMockMode: boolean;
  /** Whether lecturer ratings feature is enabled */
  ratingsEnabled: boolean;
  /** Whether auto-georgianization is enabled */
  autoGeorgianize: boolean;
  /** Whether filter-by-rating is enabled */
  filterRatingsEnabled: boolean;
}

const DataServiceContext = createContext<DataService | null>(null);

// --- Cache ---

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: LecturerRating | null;
  timestamp: number;
}

const ratingCache = new Map<string, CacheEntry>();

function getCached(key: string): LecturerRating | null | undefined {
  const entry = ratingCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    ratingCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCache(key: string, value: LecturerRating | null) {
  ratingCache.set(key, { value, timestamp: Date.now() });
}

// --- Provider ---

const client = new LecturerRatingsClient();

export function DataServiceProvider({
  children,
}: { children: preact.ComponentChildren }) {
  const { flags } = useFeatureFlags();
  const flagsRef = useRef(flags);
  flagsRef.current = flags;

  const ratingsEnabled = flags["lecturer-ratings"];
  const mockRatings = flags["mock-lecturer-ratings"];
  const mockData = flags["mock-data"];
  const autoGeorgianize = flags["auto-georgianization"];
  const filterRatingsEnabled = flags["filter-lecturers-rating"];

  const isMockMode = mockData || mockRatings;

  const fetchLecturerRating = useCallback(
    async (name: string): Promise<LecturerRating | null> => {
      const currentFlags = flagsRef.current;
      if (!currentFlags["lecturer-ratings"]) return null;

      const normalized = normalizeLecturerName(
        name,
        currentFlags["auto-georgianization"],
      );
      if (!normalized) return null;

      // Mock mode
      if (
        currentFlags["mock-data"] ||
        currentFlags["mock-lecturer-ratings"]
      ) {
        return getMockLecturerRating(
          normalized,
          currentFlags["auto-georgianization"],
        );
      }

      // Real mode — check cache first
      const cached = getCached(normalized);
      if (cached !== undefined) return cached;

      // Fetch from API
      const result = await client.fetchRatings(normalized);
      setCache(normalized, result);
      return result;
    },
    [], // Stable callback — reads flags from ref
  );

  const service = useMemo<DataService>(
    () => ({
      fetchLecturerRating,
      isMockMode,
      ratingsEnabled,
      autoGeorgianize,
      filterRatingsEnabled,
    }),
    [
      fetchLecturerRating,
      isMockMode,
      ratingsEnabled,
      autoGeorgianize,
      filterRatingsEnabled,
    ],
  );

  return (
    <DataServiceContext.Provider value={service}>
      {children}
    </DataServiceContext.Provider>
  );
}

export function useDataService(): DataService {
  const context = useContext(DataServiceContext);
  if (!context) {
    throw new Error("useDataService must be used within a DataServiceProvider");
  }
  return context;
}
