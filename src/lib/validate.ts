import type { RawDiscovery } from "../../worker/src/parsers/types";

type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validateDiscovery(raw: RawDiscovery): ValidationResult {
  if (!raw.title || raw.title.trim().length === 0) {
    return { valid: false, reason: "Missing title" };
  }
  if (!raw.url || raw.url.trim().length === 0) {
    return { valid: false, reason: "Missing URL" };
  }
  try {
    new URL(raw.url);
  } catch {
    return { valid: false, reason: "Invalid URL" };
  }
  return { valid: true };
}
