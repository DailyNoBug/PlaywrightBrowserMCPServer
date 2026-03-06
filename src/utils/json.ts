/**
 * JSON parse/stringify helpers with safe defaults.
 */

export function safeParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function stringifyCompact(value: unknown): string {
  return JSON.stringify(value);
}

export function stringifyPretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
