/**
 * Heuristic detection of login/MFA/captcha and logged-in state from page signals.
 */

export type AuthDetectionResult = 'logged_in' | 'login_required' | 'mfa_required' | 'unknown';

export interface PageSignals {
  url: string;
  visibleTextSummary?: string;
  title?: string;
}

const LOGIN_INDICATORS = [
  /login/i,
  /sign\s*in/i,
  /signin/i,
  /auth/i,
  /verify/i,
  /captcha/i,
  /two.?factor|2fa|otp|mfa/i,
  /scan.*(qr|code)/i,
];

const LOGGED_IN_INDICATORS = [
  /logout/i,
  /sign\s*out/i,
  /dashboard/i,
  /welcome,\s*\w+/i,
  /my\s+account/i,
];

export function detectAuthState(signals: PageSignals): AuthDetectionResult {
  const { url, visibleTextSummary = '', title = '' } = signals;
  const text = `${url} ${visibleTextSummary} ${title}`;

  for (const re of LOGIN_INDICATORS) {
    if (re.test(url) || re.test(visibleTextSummary) || re.test(title)) {
      if (/mfa|otp|2fa|two.?factor|verify/i.test(text)) return 'mfa_required';
      if (/captcha|scan|qr/i.test(text)) return 'login_required';
      return 'login_required';
    }
  }

  for (const re of LOGGED_IN_INDICATORS) {
    if (re.test(text)) return 'logged_in';
  }

  return 'unknown';
}

export function isLoginRequired(signals: PageSignals): boolean {
  return detectAuthState(signals) === 'login_required' || detectAuthState(signals) === 'mfa_required';
}
