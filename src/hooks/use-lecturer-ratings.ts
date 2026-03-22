import { useEffect, useState } from "preact/hooks";
import { useDataService } from "@/contexts/data-service";
import type { LecturerRating } from "@/lib/lecturer-ratings";

export function useLecturerRating(lecturerName: string | null) {
  const { fetchLecturerRating, ratingsEnabled } = useDataService();
  const [rating, setRating] = useState<LecturerRating | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ratingsEnabled || !lecturerName) {
      setRating(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchLecturerRating(lecturerName)
      .then((result) => {
        if (cancelled) return;
        setRating(result);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setRating(null);
        setError(err instanceof Error ? err.message : "Failed to fetch rating");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchLecturerRating, lecturerName, ratingsEnabled]);

  return { rating, loading, error };
}
