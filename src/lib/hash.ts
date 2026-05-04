import { createHash } from "crypto";

export function hashUrl(url: string): string {
  return createHash("sha256").update(url.trim().toLowerCase()).digest("hex");
}

export function hashContent(title: string, text?: string | null): string {
  const input = `${title}${text || ""}`.trim();
  return createHash("sha256").update(input).digest("hex");
}
