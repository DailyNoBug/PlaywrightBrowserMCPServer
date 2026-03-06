import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function generateSessionId(): string {
  return `session-${uuidv4().slice(0, 8)}`;
}

export function generateSnapshotId(): string {
  return `snap-${uuidv4().slice(0, 8)}`;
}

export function generateExtractionId(): string {
  return `ext-${uuidv4().slice(0, 8)}`;
}
