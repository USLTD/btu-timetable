import type { ParsedTime } from "./types";
import * as msg from "@/paraglide/messages";

export function parseTime(timeStr: string): ParsedTime | null {
  const parts = timeStr.split(/[-–—]/);
  if (parts.length !== 2) return null;
  const startParts = parts[0].trim().split(':').map(Number);
  const endParts = parts[1].trim().split(':').map(Number);
  const sH = startParts[0], sM = startParts[1] || 0;
  const eH = endParts[0], eM = endParts[1] || 0;
  if (Number.isNaN(sH) || Number.isNaN(eH) || Number.isNaN(sM) || Number.isNaN(eM)) return null;
  return { start: sH * 60 + sM, end: eH * 60 + eM };
}

export function formatTimeInput(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function formatClockTime(
  mins: number,
  locale?: string,
): string {
  // Map app locale codes to full BCP-47 tags so Node.js ICU data recognises them
  const bcp47Map: Record<string, string> = { en: "en-US", ka: "ka-GE" };
  const bcp47 = locale ? (bcp47Map[locale] ?? locale) : undefined;
  const date = new Date(2026, 0, 1, 0, 0);
  date.setMinutes(mins);
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  try {
    return new Intl.DateTimeFormat(bcp47, options).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

export function formatTimeRange(
  timeStr: string,
  locale?: string,
): string {
  const parsed = parseTime(timeStr);
  if (!parsed) return timeStr;
  const start = formatClockTime(parsed.start, locale);
  const end = formatClockTime(parsed.end, locale);
  return `${start}–${end}`;
}

/** Format minutes into a human-readable duration like "2h 10m" or "45m". */
export function formatDuration(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Verbose version: "2 hours 10 minutes", "45 minutes". */
export function formatDurationLong(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const hPart = h > 0 ? `${h} ${h !== 1 ? msg.hours() : msg.hour()}` : '';
  const mPart = m > 0 ? `${m} ${m !== 1 ? msg.minutes() : msg.minute()}` : '';
  if (hPart && mPart) return `${hPart} ${mPart}`;
  if (!hPart && !mPart) return `0 ${msg.minutes()}`;
  return hPart || mPart;
}
