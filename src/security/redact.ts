/**
 * Redact sensitive data from logs and exports.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
const TOKEN_RE = /(bearer\s+[a-zA-Z0-9._-]+|token["']?\s*[:=]\s*["']?[a-zA-Z0-9._-]+)/gi;
const LONG_NUM_RE = /\b\d{12,}\b/g;

export function redactText(text: string): string {
  return text
    .replace(EMAIL_RE, '[EMAIL_REDACTED]')
    .replace(PHONE_RE, '[PHONE_REDACTED]')
    .replace(TOKEN_RE, '[TOKEN_REDACTED]')
    .replace(LONG_NUM_RE, '[NUMBER_REDACTED]');
}

export function redactObject<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redactObject) as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase();
    if (key.includes('password') || key.includes('token') || key.includes('cookie') || key === 'authorization') {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redactObject(v);
    }
  }
  return out as T;
}
