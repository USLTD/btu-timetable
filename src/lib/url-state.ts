import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { saveState } from './storage.ts';
import type { Course, DaySettings, LecturerPref, MinMax } from '../types.ts';

/** The subset of app state that is shareable via URL */
export interface ShareableState {
  courses: Course[];
  daySettings: DaySettings;
  globalTime: MinMax;
  classesPerDay: MinMax;
  maxOverlap: number;
  dailyCommute: MinMax;
  lecturerPrefs: LecturerPref[];
}

/** localStorage key → ShareableState field mapping */
const KEY_MAP: { key: string; field: keyof ShareableState }[] = [
  { key: 'app-courses', field: 'courses' },
  { key: 'app-day-settings', field: 'daySettings' },
  { key: 'app-global-time', field: 'globalTime' },
  { key: 'app-classes-per-day', field: 'classesPerDay' },
  { key: 'app-max-overlap', field: 'maxOverlap' },
  { key: 'app-commute', field: 'dailyCommute' },
  { key: 'app-lecturer-prefs', field: 'lecturerPrefs' },
];

const HASH_PREFIX = '#share=';

/** Encode shareable state into a URL-safe compressed string */
export function encodeState(state: ShareableState): string {
  return compressToEncodedURIComponent(JSON.stringify(state));
}

/** Migrate old-format state (instructor → lecturer) if needed */
function migrateState(raw: Record<string, unknown>): ShareableState {
  const state = raw as unknown as ShareableState & { instructorPrefs?: { instructor?: string; weight: string }[] };

  // Migrate instructorPrefs → lecturerPrefs
  if (!state.lecturerPrefs && state.instructorPrefs) {
    state.lecturerPrefs = state.instructorPrefs.map(p => ({
      lecturer: (p as any).lecturer ?? p.instructor ?? '',
      weight: p.weight as any,
    }));
    delete state.instructorPrefs;
  }

  // Migrate Group.instructor → Group.lecturer in courses
  if (state.courses) {
    for (const course of state.courses) {
      for (const group of course.groups) {
        const g = group as any;
        if (g.instructor !== undefined && g.lecturer === undefined) {
          g.lecturer = g.instructor;
          delete g.instructor;
        }
      }
    }
  }

  return state;
}

/** Decode a compressed string back into shareable state (returns null on failure) */
export function decodeState(encoded: string): ShareableState | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    return migrateState(JSON.parse(json));
  } catch {
    return null;
  }
}

/**
 * Check the URL hash on page load. If it contains shared state,
 * write it to localStorage so React picks it up on first render.
 * Must be called BEFORE React mounts.
 */
export function restoreFromHash(): boolean {
  const hash = location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return false;

  const encoded = hash.slice(HASH_PREFIX.length);
  const state = decodeState(encoded);
  if (!state) return false;

  // Write each field to its localStorage key
  for (const { key, field } of KEY_MAP) {
    saveState(key, state[field]);
  }
  // Clear computed results so stale schedules don't show
  saveState('app-schedules', []);

  return true;
}

/**
 * Build current shareable state from the provided values,
 * encode it, set the URL hash, and copy the full URL to clipboard.
 * Returns the encoded hash string.
 */
export function shareToUrl(state: ShareableState): string {
  const encoded = encodeState(state);
  history.replaceState(null, '', `${HASH_PREFIX}${encoded}`);
  navigator.clipboard.writeText(location.href).catch(() => {});
  return encoded;
}

/**
 * Apply a raw encoded hash string to localStorage and trigger re-render.
 * Returns true on success.
 */
export function importHash(encoded: string): boolean {
  const state = decodeState(encoded);
  if (!state) return false;

  for (const { key, field } of KEY_MAP) {
    saveState(key, state[field]);
  }
  saveState('app-schedules', []);
  return true;
}
