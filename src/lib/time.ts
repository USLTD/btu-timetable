import type { ParsedTime } from '../types.ts';

export function parseTime(timeStr: string): ParsedTime | null {
  const parts = timeStr.split(/[-–—]/);
  if (parts.length !== 2) return null;
  const [sH, sM] = parts[0].trim().split(':').map(Number);
  const [eH, eM] = parts[1].trim().split(':').map(Number);
  if (isNaN(sH) || isNaN(eM)) return null;
  return { start: sH * 60 + sM, end: eH * 60 + eM };
}

export function formatTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
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
  const hPart = h > 0 ? `${h} hour${h !== 1 ? 's' : ''}` : '';
  const mPart = m > 0 ? `${m} minute${m !== 1 ? 's' : ''}` : '';
  if (hPart && mPart) return `${hPart} ${mPart}`;
  return hPart || mPart || '0 minutes';
}

