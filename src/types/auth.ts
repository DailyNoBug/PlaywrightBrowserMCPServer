/**
 * Auth context metadata types.
 */

export interface AuthContextMeta {
  authContextId: string;
  name: string;
  domain: string;
  environment?: string;
  createdAt: string;
  updatedAt: string;
  storageStatePath: string;
  isValid: boolean;
  lastVerifiedAt?: string;
}
