/**
 * Validate that a URL is allowed by allow/deny domain rules.
 */

export interface DomainGuardConfig {
  allowDomains: string[];
  denyDomains: string[];
  defaultAllow?: boolean;
}

export function isDomainAllowed(url: string, config: DomainGuardConfig): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (config.denyDomains.some((d) => host === d.toLowerCase() || host.endsWith('.' + d.toLowerCase()))) {
    return false;
  }
  if (config.allowDomains.length === 0) {
    return config.defaultAllow === true;
  }
  return config.allowDomains.some((d) => host === d.toLowerCase() || host.endsWith('.' + d.toLowerCase()));
}
