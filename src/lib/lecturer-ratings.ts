export interface LecturerReview {
  id: string;
  rating: number;
  review: string | null;
  date: string;
}

export interface LecturerRating {
  id: string;
  lecturer: string;
  courses: string[];
  rating: number;
  reviewCount: number;
  reviews: LecturerReview[];
}

const GEORGIAN_REGEX = /[\u10A0-\u10FF]/;

const DIGRAPH_MAP: Record<string, string> = {
  sh: "შ",
  ch: "ჩ",
  ts: "ც",
  dz: "ძ",
  kh: "ხ",
  gh: "ღ",
  zh: "ჟ",
  ph: "ფ",
  th: "თ",
};

const CHAR_MAP: Record<string, string> = {
  a: "ა",
  b: "ბ",
  g: "გ",
  d: "დ",
  e: "ე",
  v: "ვ",
  z: "ზ",
  t: "ტ",
  i: "ი",
  k: "კ",
  l: "ლ",
  m: "მ",
  n: "ნ",
  o: "ო",
  p: "პ",
  r: "რ",
  s: "ს",
  u: "უ",
  f: "ფ",
  q: "ქ",
  j: "ჯ",
  y: "ი",
  w: "ვ",
  x: "ხ",
  h: "ჰ",
  c: "ც",
};

// Reverse mappings for Georgian → Latin
const REVERSE_DIGRAPH_MAP: Record<string, string> = {};
for (const [latin, georgian] of Object.entries(DIGRAPH_MAP)) {
  // Only keep the first mapping for each Georgian char
  if (!REVERSE_DIGRAPH_MAP[georgian]) {
    REVERSE_DIGRAPH_MAP[georgian] = latin;
  }
}

const REVERSE_CHAR_MAP: Record<string, string> = {};
for (const [latin, georgian] of Object.entries(CHAR_MAP)) {
  // Only keep the first mapping for each Georgian char (skip duplicates like y→ი, w→ვ)
  if (!REVERSE_CHAR_MAP[georgian]) {
    REVERSE_CHAR_MAP[georgian] = latin;
  }
}

export function latinToGeorgian(value: string): string {
  const lower = value.toLowerCase();
  let result = "";
  let i = 0;
  while (i < lower.length) {
    const two = lower.slice(i, i + 2);
    if (DIGRAPH_MAP[two]) {
      result += DIGRAPH_MAP[two];
      i += 2;
      continue;
    }
    const ch = lower[i];
    result += CHAR_MAP[ch] ?? value[i];
    i += 1;
  }
  return result;
}

export function georgianToLatin(value: string): string {
  let result = "";
  for (const ch of value) {
    // Check digraph reverse first (single Georgian char → digraph)
    if (REVERSE_DIGRAPH_MAP[ch]) {
      result += REVERSE_DIGRAPH_MAP[ch];
    } else if (REVERSE_CHAR_MAP[ch]) {
      result += REVERSE_CHAR_MAP[ch];
    } else {
      result += ch;
    }
  }
  return result;
}

export function isGeorgian(value: string): boolean {
  return GEORGIAN_REGEX.test(value);
}

export function normalizeLecturerName(
  name: string,
  autoGeorgianize = true,
): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  if (GEORGIAN_REGEX.test(trimmed)) return trimmed;
  if (!autoGeorgianize) return trimmed;
  return latinToGeorgian(trimmed);
}

// --- API types (raw response) ---
interface ApiLecturerRating {
  id: string;
  lecturer: string;
  courses: string[];
  rating: number;
  review_count: number;
  reviews: LecturerReview[];
}

function mapApiResponse(raw: ApiLecturerRating): LecturerRating {
  return {
    id: raw.id,
    lecturer: raw.lecturer,
    courses: raw.courses,
    rating: raw.rating,
    reviewCount: raw.review_count,
    reviews: raw.reviews,
  };
}

const API_BASE = "https://rateuni.framework.ge/api/lecturer-rating";
const FETCH_TIMEOUT_MS = 8000;

export class LecturerRatingsClient {
  async fetchRatings(lecturerName: string): Promise<LecturerRating | null> {
    try {
      const url = `${API_BASE}?lecturer_name=${encodeURIComponent(lecturerName)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        // 404 = not found, other errors also graceful
        return null;
      }

      const raw = (await response.json()) as ApiLecturerRating;
      return mapApiResponse(raw);
    } catch {
      // Network error, timeout, parse error — all return null
      return null;
    }
  }
}

const MOCK_RATING: LecturerRating = {
  id: "EB624D",
  lecturer: "დიანა ცოტაძე",
  courses: ["ფინანსური აღრიცხვა"],
  rating: 5,
  reviewCount: 26,
  reviews: [
    {
      id: "327E89",
      rating: 5,
      review: "ეს ქალი რო არა მეტენებოდა საგანი. respect<3",
      date: "2026-02-21 22:09:29",
    },
    {
      id: "6AE271",
      rating: 5,
      review:
        "უსაყვარლესი ლექტორი. ძალიან კარგად ხსნის და გამოცდებისთვის სრულფასოვნად ამზადებს სტუდენტებს.",
      date: "2026-01-21 18:01:36",
    },
    {
      id: "1A9504",
      rating: 5,
      review: "საუკეთესო ლექტორი და ადამიანი❤️❤️",
      date: "2026-01-11 09:52:07",
    },
  ],
};

export function getMockLecturerRating(
  name: string,
  autoGeorgianize = true,
): LecturerRating | null {
  const normalized = normalizeLecturerName(name, autoGeorgianize);
  if (!normalized) return null;
  if (normalized === MOCK_RATING.lecturer) return MOCK_RATING;
  return {
    ...MOCK_RATING,
    id: `${MOCK_RATING.id}-${normalized}`,
    lecturer: normalized,
  };
}
