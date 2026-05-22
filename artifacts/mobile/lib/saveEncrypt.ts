/**
 * saveEncrypt.ts — lightweight save-file obfuscation
 *
 * XOR-cipher every byte of the JSON string with a cycling key, then btoa.
 * Game save JSON is always pure ASCII (numeric values + ASCII keys), so
 * every XOR result is in 0x00–0x7F — directly btoa-compatible without any
 * encodeURIComponent / unescape dance that can silently fail on some runtimes.
 *
 * Prefix "CE3:" tells the loader this is an encrypted save so it can migrate
 * legacy plain-JSON saves transparently.
 */

const CIPHER_KEY = "CE7x9pK3mQ2nR8vL4jS5tU6wV0yZ1aB";
const PREFIX = "CE3:";

function xorString(str: string, key: string): string {
  const out: string[] = new Array(str.length);
  const kLen = key.length;
  for (let i = 0; i < str.length; i++) {
    out[i] = String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % kLen));
  }
  return out.join("");
}

export function encryptSave(json: string): string {
  try {
    return PREFIX + btoa(xorString(json, CIPHER_KEY));
  } catch {
    // btoa failed (shouldn't happen for ASCII JSON) — fall back to plain JSON.
    return json;
  }
}

export function decryptSave(raw: string): string {
  if (!raw.startsWith(PREFIX)) {
    // Legacy plain-JSON save or encryption fallback — return as-is.
    return raw;
  }
  try {
    return xorString(atob(raw.slice(PREFIX.length)), CIPHER_KEY);
  } catch {
    // atob failed — return raw so the caller can try plain JSON.parse.
    return raw;
  }
}
