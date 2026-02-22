import type { DayNumber } from '../types.ts';

export const DAY_MAP: Record<string, DayNumber> = {
  'ორშაბათი': 1, 'სამშაბათი': 2, 'ოთხშაბათი': 3,
  'ხუთშაბათი': 4, 'პარასკევი': 5, 'შაბათი': 6, 'კვირა': 7
};


export const CALENDAR_COLORS = [
  'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200',
  'bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200',
  'bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600 text-purple-800 dark:text-purple-200',
  'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200',
  'bg-orange-100 dark:bg-orange-900/40 border-orange-400 dark:border-orange-600 text-orange-800 dark:text-orange-200',
  'bg-teal-100 dark:bg-teal-900/40 border-teal-400 dark:border-teal-600 text-teal-800 dark:text-teal-200',
];

/**
 * Get a localized day name using ICU / Intl.DateTimeFormat.
 * dayNum: 1=Monday … 7=Sunday (ISO weekday).
 */
export function localizedDayName(dayNum: DayNumber, locale: string, style: 'long' | 'short' | 'narrow' = 'long'): string {
  // Jan 5 2026 is a Monday (dayNum 1)
  const refMonday = new Date(2026, 0, 5);
  const date = new Date(refMonday);
  date.setDate(refMonday.getDate() + (dayNum - 1));
  return new Intl.DateTimeFormat(locale, { weekday: style }).format(date);
}

