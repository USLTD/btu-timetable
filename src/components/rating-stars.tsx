import { Star, StarHalf } from "lucide-preact";
import { cx } from "@/lib/cx";

type RatingStarsProps = {
  rating: number;
  max?: number;
  className?: string;
  starClassName?: string;
  label?: string;
};

export function RatingStars({
  rating,
  max = 5,
  className = "",
  starClassName = "",
  label,
}: RatingStarsProps) {
  const safeRating =
    typeof rating === "number" && Number.isFinite(rating) ? rating : 0;
  const fullStars = Math.floor(safeRating);
  const hasHalf = safeRating - fullStars >= 0.25 && safeRating - fullStars < 0.75;
  const roundedUp = safeRating - fullStars >= 0.75;
  const filledCount = roundedUp ? fullStars + 1 : fullStars;
  const ariaLabel = label ?? `${safeRating.toFixed(1)}/${max}`;

  return (
    <span
      class={cx(styles.wrap, className)}
      role="img"
      aria-label={ariaLabel}
    >
      {Array.from({ length: max }, (_, idx) => {
        const starNumber = idx + 1;
        if (starNumber <= filledCount) {
          return (
            <Star
              key={starNumber}
              class={cx(styles.star, starClassName, styles.starFilled)}
            />
          );
        }
        if (hasHalf && starNumber === filledCount + 1) {
          return (
            <span key={starNumber} class={cx(styles.halfWrap, starClassName)}>
              <StarHalf
                class={cx(styles.star, styles.starFilled)}
              />
            </span>
          );
        }
        return (
          <Star
            key={starNumber}
            class={cx(styles.star, starClassName)}
          />
        );
      })}
    </span>
  );
}

const styles = {
  wrap: "inline-flex items-center gap-0.5",
  star: "w-4 h-4 shrink-0 text-amber-500",
  starFilled: "fill-current",
  halfWrap: "relative inline-flex items-center justify-center",
};
