import type { DayNumber, DaySettings } from "./types.d.ts";
import { colors, withAlpha } from "@/styles/tokens";

export const DEFAULT_DAY_SETTING = { min: 480, max: 1260 } as const;
export const INITIAL_DAY_SETTINGS: DaySettings = {
  1: { pref: "enabled", ...DEFAULT_DAY_SETTING },
  2: { pref: "enabled", ...DEFAULT_DAY_SETTING },
  3: { pref: "enabled", ...DEFAULT_DAY_SETTING },
  4: { pref: "enabled", ...DEFAULT_DAY_SETTING },
  5: { pref: "enabled", ...DEFAULT_DAY_SETTING },
  6: { pref: "enabled", ...DEFAULT_DAY_SETTING },
  7: { pref: "enabled", ...DEFAULT_DAY_SETTING },
};

export function normalizeDayKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "")
    .trim();
}

export const DAY_MAP: Record<string, DayNumber> = {
  // Georgian
  ორშაბათი: 1,
  სამშაბათი: 2,
  ოთხშაბათი: 3,
  ხუთშაბათი: 4,
  პარასკევი: 5,
  შაბათი: 6,
  კვირა: 7,
  // English (normalized)
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  sun: 7,
  sunday: 7,
};

export const CALENDAR_COLORS = [
  {
    bg: colors.blue[100],
    bgDark: withAlpha(colors.blue[900], 0.4),
    border: colors.blue[400],
    borderDark: colors.blue[600],
    text: colors.blue[800],
    textDark: colors.blue[200],
  },
  {
    bg: colors.green[100],
    bgDark: withAlpha(colors.green[900], 0.4),
    border: colors.green[400],
    borderDark: colors.green[600],
    text: colors.green[800],
    textDark: colors.green[200],
  },
  {
    bg: colors.purple[100],
    bgDark: withAlpha(colors.purple[900], 0.4),
    border: colors.purple[400],
    borderDark: colors.purple[600],
    text: colors.purple[800],
    textDark: colors.purple[200],
  },
  {
    bg: colors.yellow[100],
    bgDark: withAlpha(colors.yellow[900], 0.4),
    border: colors.yellow[400],
    borderDark: colors.yellow[600],
    text: colors.yellow[800],
    textDark: colors.yellow[200],
  },
  {
    bg: colors.orange[100],
    bgDark: withAlpha(colors.orange[900], 0.4),
    border: colors.orange[400],
    borderDark: colors.orange[600],
    text: colors.orange[800],
    textDark: colors.orange[200],
  },
  {
    bg: colors.teal[100],
    bgDark: withAlpha(colors.teal[900], 0.4),
    border: colors.teal[400],
    borderDark: colors.teal[600],
    text: colors.teal[800],
    textDark: colors.teal[200],
  },
];

import * as m from "@/paraglide/messages";

/**
 * Get a localized day name using Paraglide.
 * dayNum: 1=Monday … 7=Sunday (ISO weekday).
 */
export function localizedDayName(
  dayNum: DayNumber,
  _locale: string,
  style: "long" | "short" | "narrow" = "long",
): string {
  if (style === "short" || style === "narrow") {
    switch (dayNum) {
      case 1: return m.monday_short();
      case 2: return m.tuesday_short();
      case 3: return m.wednesday_short();
      case 4: return m.thursday_short();
      case 5: return m.friday_short();
      case 6: return m.saturday_short();
      case 7: return m.sunday_short();
    }
  }
  switch (dayNum) {
    case 1: return m.monday();
    case 2: return m.tuesday();
    case 3: return m.wednesday();
    case 4: return m.thursday();
    case 5: return m.friday();
    case 6: return m.saturday();
    case 7: return m.sunday();
  }
  return "";
}
