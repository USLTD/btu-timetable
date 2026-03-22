import { deflateSync, inflateSync } from "fflate";
import lzString from "lz-string";
import { base64ToBytes, bytesToBase64 } from "@/lib/utils";
import { decodeBackup, decodeBackupBytes, encodeBackupBytes } from "./backup";
import { copyToClipboard } from "./clipboard";
import { getEffectiveFlags } from "./feature-flags";
import type { ShareableState } from "./shareable-state";
import {
  globalClassesPerDay,
  globalCourses,
  globalDailyCommute,
  globalDaySettings,
  globalLecturerPrefs,
  globalMaxOverlap,
  globalSchedules,
  globalRejections,
  globalTime,
} from "@/store";

const HASH_PREFIX = "#share=";
const COMPRESSED_PREFIX = "z:";

/** Encode a shareable state into a URL-safe compressed string (legacy v2) */
export function encodeLegacyState(state: ShareableState): string {
  return lzString.compressToEncodedURIComponent(JSON.stringify(state));
}

/** Decode a compressed string back into a shareable state (legacy v2) */
export function decodeLegacyState(encoded: string): ShareableState | null {
  try {
    const json = lzString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as ShareableState;
    return parsed;
  } catch {
    return null;
  }
}

export function applyShareableState(state: ShareableState) {
  globalCourses.value = state.courses;
  globalDaySettings.value = state.daySettings;
  globalTime.value = state.globalTime;
  globalClassesPerDay.value = state.classesPerDay;
  globalMaxOverlap.value = state.maxOverlap;
  globalDailyCommute.value = state.dailyCommute;
  globalLecturerPrefs.value = state.lecturerPrefs;
  globalSchedules.value = [];
  globalRejections.value = [];
}

function decodeCompressedProto(encoded: string): ShareableState | null {
  if (!encoded.startsWith(COMPRESSED_PREFIX)) return null;
  try {
    const payload = encoded.slice(COMPRESSED_PREFIX.length);
    const compressed = base64ToBytes(payload);
    const bytes = inflateSync(compressed);
    return decodeBackupBytes(bytes);
  } catch {
    return null;
  }
}

export function encodeProtoHash(state: ShareableState): string {
  const bytes = encodeBackupBytes(state);
  const compressed = deflateSync(bytes);
  return `${COMPRESSED_PREFIX}${bytesToBase64(compressed)}`;
}

export function shareToUrlLegacy(state: ShareableState): string {
  const encoded = encodeLegacyState(state);
  history.replaceState(null, "", `${HASH_PREFIX}${encoded}`);
  copyToClipboard(location.href).catch(() => {});
  return encoded;
}

export function shareToUrlProto(state: ShareableState): string {
  const encoded = encodeProtoHash(state);
  history.replaceState(null, "", `${HASH_PREFIX}${encoded}`);
  copyToClipboard(location.href).catch(() => {});
  return encoded;
}

export function importLegacyHash(encoded: string): boolean {
  const state = decodeLegacyState(encoded);
  if (!state) return false;
  applyShareableState(state);
  return true;
}

export function importProtoHash(encoded: string, allowLegacy = false): boolean {
  const compressedState = decodeCompressedProto(encoded);
  if (compressedState) {
    applyShareableState(compressedState);
    return true;
  }
  if (encoded.startsWith(COMPRESSED_PREFIX)) return false;

  const state = decodeBackup(encoded);
  if (state) {
    applyShareableState(state);
    return true;
  }
  if (!allowLegacy) return false;
  return importLegacyHash(encoded);
}

export function importProtoBytes(
  bytes: Uint8Array,
  allowLegacy = false,
): boolean {
  const state = decodeBackupBytes(bytes);
  if (state) {
    applyShareableState(state);
    return true;
  }
  if (!allowLegacy) return false;
  return false;
}

export function restoreFromHash(): boolean {
  const hash = location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return false;

  const encoded = hash.slice(HASH_PREFIX.length);
  const flags = getEffectiveFlags();
  if (flags["protobuf-backup"]) {
    return importProtoHash(encoded, flags["protobuf-legacy-v2"]);
  }
  return importLegacyHash(encoded);
}
