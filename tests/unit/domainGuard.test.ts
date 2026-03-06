import { describe, it, expect } from 'vitest';
import { isDomainAllowed } from '../../src/security/domainGuard.js';

describe('domainGuard', () => {
  it('allows URL when host is in allowDomains', () => {
    expect(isDomainAllowed('https://example.com/path', { allowDomains: ['example.com'], denyDomains: [] })).toBe(true);
    expect(isDomainAllowed('https://app.example.com/x', { allowDomains: ['example.com'], denyDomains: [] })).toBe(true);
  });

  it('denies URL when host is in denyDomains', () => {
    expect(isDomainAllowed('https://evil.com', { allowDomains: ['example.com'], denyDomains: ['evil.com'] })).toBe(false);
  });

  it('denies when allowDomains is empty and defaultAllow is false', () => {
    expect(isDomainAllowed('https://example.com', { allowDomains: [], denyDomains: [] })).toBe(false);
  });
});
