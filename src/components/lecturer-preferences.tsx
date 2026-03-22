import { useState, useMemo } from "preact/hooks";
import { Star, X, ChevronDown, ChevronUp, Info, Loader } from "lucide-preact";
import * as m from "@/paraglide/messages";
import { georgianToLatin, getMockLecturerRating, isGeorgian } from "@/lib/lecturer-ratings";
import { useLecturerRating } from "@/hooks/use-lecturer-ratings";
import { useDataService } from "@/contexts/data-service";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { RatingStars } from "@/components/rating-stars";
import { cx } from "@/lib/cx";
import type { Course, LecturerPref, LecturerWeight } from "@/lib/types";

interface LecturerPreferencesProps {
  courses: Course[];
  lecturerPrefs: LecturerPref[];
  setLecturerPrefs: (v: LecturerPref[]) => void;
  minRating?: number;
  setMinRating?: (v: number) => void;
}

const MAX_RATING = 5;

export function LecturerPreferences({
  courses,
  lecturerPrefs,
  setLecturerPrefs,
  minRating,
  setMinRating,
}: LecturerPreferencesProps) {
  const [expanded, setExpanded] = useState(false);
  const [detailLecturer, setDetailLecturer] = useState<string | null>(null);
  const { ratingsEnabled, isMockMode, autoGeorgianize, filterRatingsEnabled } =
    useDataService();

  const allLecturers = useMemo(
    () =>
      [...new Set(courses.flatMap((c) => c.groups.map((g) => g.lecturer)))]
        .filter(Boolean)
        .sort(),
    [courses],
  );

  const getLecturerWeight = (name: string): LecturerWeight => {
    return lecturerPrefs.find((p) => p.lecturer === name)?.weight ?? "neutral";
  };

  const cycleLecturerPref = (name: string) => {
    const current = getLecturerWeight(name);
    const order: LecturerWeight[] = ["neutral", "prefer", "avoid"];
    const next = order[(order.indexOf(current) + 1) % 3];
    const filtered = lecturerPrefs.filter((p) => p.lecturer !== name);
    if (next !== "neutral") filtered.push({ lecturer: name, weight: next });
    setLecturerPrefs(filtered);
  };

  // Details dialog rating fetch — uses centralized data service
  const { rating: detailRating, loading: detailLoading } =
    useLecturerRating(detailLecturer);

  if (allLecturers.length === 0) return null;

  return (
    <>
      <div class={styles.card}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          class={styles.cardHeader}
        >
          <div class={styles.cardTitle}>
            <Star class={styles.cardIcon} />
            {m.lecturer_preferences()}
            {lecturerPrefs.length > 0 && (
              <span class={styles.badge}>{lecturerPrefs.length}</span>
            )}
          </div>
          {expanded ? (
            <ChevronUp class={styles.chevron} />
          ) : (
            <ChevronDown class={styles.chevron} />
          )}
        </button>
        {expanded && (
          <div class={styles.body}>
            {filterRatingsEnabled && minRating !== undefined && setMinRating && (
              <div class={styles.ratingFilterRow}>
                <label class={styles.ratingFilterLabel}>{m.min_rating()}</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number((e.target as HTMLSelectElement).value))}
                  class={styles.ratingSelect}
                >
                  <option value={0}>{m.min_rating_any()}</option>
                  <option value={3.0}>&gt; 3.0</option>
                  <option value={3.5}>&gt; 3.5</option>
                  <option value={4.0}>&gt; 4.0</option>
                  <option value={4.5}>&gt; 4.5</option>
                </select>
              </div>
            )}
            <p class={styles.note}>
              {m.click_to_cycle_neutral_prefer_avoid()}
            </p>
            <div class={styles.list}>
              {allLecturers.map((name) => {
                const weight = getLecturerWeight(name);
                const mockRating =
                  ratingsEnabled && isMockMode
                    ? getMockLecturerRating(name, autoGeorgianize)
                    : null;
                const ratingValue = mockRating
                  ? mockRating.rating.toFixed(1)
                  : "?";
                const cls =
                  weight === "prefer"
                    ? styles.prefer
                    : weight === "avoid"
                      ? styles.avoid
                      : styles.neutral;
                const icon =
                  weight === "prefer" ? (
                    <Star class={styles.iconFilled} />
                  ) : weight === "avoid" ? (
                    <X class={styles.icon} />
                  ) : null;

                // Show transliteration for Georgian names
                const showTranslit = autoGeorgianize && isGeorgian(name);
                const translitName = showTranslit ? georgianToLatin(name) : null;

                return (
                  <div key={name} class={cx(styles.lecturerItem, cls)}>
                    <button
                      type="button"
                      class={styles.lecturerButton}
                      onClick={() => cycleLecturerPref(name)}
                    >
                      {icon}
                      <span class={styles.lecturerName}>
                        {name}
                        {translitName && (
                          <span class={styles.translitName}> ({translitName})</span>
                        )}
                      </span>
                    </button>
                    {ratingsEnabled && mockRating && (
                      <span class={styles.ratingText}>
                        <code>
                          {ratingValue}/{MAX_RATING}
                        </code>
                      </span>
                    )}
                    {ratingsEnabled && (
                      <button
                        type="button"
                        class={styles.detailBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailLecturer(name);
                        }}
                        title={m.group_details()}
                        aria-label={`${name} details`}
                      >
                        <Info class={styles.detailIcon} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lecturer detail dialog */}
      <ResponsiveDialog
        open={!!detailLecturer}
        onClose={() => setDetailLecturer(null)}
        title={detailLecturer ?? ""}
      >
        <div class={styles.detailWrap}>
          {detailLoading ? (
            <div class={styles.detailLoading}>
              <Loader class={styles.detailSpinner} />
              <span class={styles.detailLoadingText}>Loading…</span>
            </div>
          ) : detailRating ? (
            <>
              <div class={styles.detailRatingRow}>
                <RatingStars
                  rating={detailRating.rating}
                  className={styles.detailStars}
                  starClassName={styles.detailStar}
                  label={m.rating_summary({
                    0: detailRating.rating.toFixed(1),
                    1: detailRating.reviewCount,
                  })}
                />
                <span class={styles.detailSummary}>
                  {m.rating_summary({
                    0: detailRating.rating.toFixed(1),
                    1: detailRating.reviewCount,
                  })}
                </span>
              </div>
              {detailRating.reviews.some((r) => r.review) && (
                <div class={styles.detailReviews}>
                  <div class={styles.detailReviewsTitle}>
                    {m.recent_reviews()}
                  </div>
                  <ul class={styles.detailReviewList}>
                    {detailRating.reviews
                      .filter((r) => r.review)
                      .slice(0, 5)
                      .map((r) => (
                        <li key={r.id} class={styles.detailReviewItem}>
                          &ldquo;{r.review}&rdquo;
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p class={styles.detailEmpty}>{m.ratings_coming_soon()}</p>
          )}
        </div>
      </ResponsiveDialog>
    </>
  );
}

const styles = {
  card: "border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800 mb-3",
  cardHeader:
    "w-full px-4 py-3 bg-gray-50 flex justify-between items-center transition-colors cursor-pointer hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700",
  cardTitle:
    "flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200",
  cardIcon: "w-4 h-4",
  badge:
    "text-xs px-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  chevron: "w-5 h-5 text-gray-500",
  body: "p-4 border-t border-gray-200 space-y-3 dark:border-gray-700",
  ratingFilterRow: "flex items-center justify-between bg-blue-50/50 p-2.5 rounded-md border border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/30",
  ratingFilterLabel: "text-xs font-medium text-gray-700 dark:text-gray-300",
  ratingSelect: "text-xs py-1 pl-2 pr-7 rounded border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none leading-tight",
  note: "text-[10px] text-gray-500 pb-2 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700",
  list: "flex flex-wrap gap-2 pt-1",
  lecturerItem:
    "flex items-center gap-1.5 border rounded-full px-2 py-1 text-xs transition-colors",
  lecturerButton:
    "flex items-center gap-1 bg-transparent cursor-pointer",
  lecturerName: "max-w-[200px] truncate",
  translitName: "text-[10px] opacity-60 font-normal",
  icon: "w-3 h-3 shrink-0",
  iconFilled: "w-3 h-3 shrink-0 fill-current",
  prefer:
    "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  avoid:
    "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  neutral:
    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
  ratingText:
    "font-mono text-[10px] leading-normal pt-[1.5px] text-gray-500 dark:text-gray-400 whitespace-nowrap",
  detailBtn:
    "p-0.5 rounded-md text-gray-400 transition-colors cursor-pointer hover:text-blue-500 dark:hover:text-blue-400",
  detailIcon: "w-3.5 h-3.5",
  detailWrap: "space-y-3",
  detailLoading: "flex items-center gap-2 justify-center py-4",
  detailSpinner: "w-4 h-4 animate-spin text-blue-500",
  detailLoadingText: "text-sm text-gray-500 dark:text-gray-400",
  detailRatingRow: "flex items-center gap-2",
  detailStars: "text-amber-500",
  detailStar: "w-4 h-4",
  detailSummary: "text-sm text-gray-600 dark:text-gray-300",
  detailReviews: "space-y-1",
  detailReviewsTitle:
    "text-[10px] uppercase tracking-[0.08em] text-gray-400",
  detailReviewList: "space-y-1",
  detailReviewItem:
    "text-xs text-gray-600 leading-snug dark:text-gray-300",
  detailEmpty: "text-xs text-gray-500 dark:text-gray-400",
};
