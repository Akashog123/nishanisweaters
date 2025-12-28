/**
 * Session ID management for guest users
 * Provides persistent session identification for cart persistence without authentication
 */

import { logger } from './logger';

const SESSION_ID_KEY = 'blockhaus_session_id';

/**
 * Generates a cryptographically secure random session ID
 */
function generateSessionId(): string {
  // Use crypto API for better randomness
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets the current session ID from localStorage
 * Creates a new one if it doesn't exist
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    // SSR fallback
    return generateSessionId();
  }

  try {
    let sessionId = localStorage.getItem(SESSION_ID_KEY);

    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem(SESSION_ID_KEY, sessionId);
    }

    return sessionId;
  } catch (error) {
    // localStorage might be unavailable (private browsing, etc.)
    logger.warn('Unable to access localStorage for session ID', { error });
    return generateSessionId();
  }
}

/**
 * Clears the session ID from localStorage
 * Typically called after successful cart merge on login
 */
export function clearSessionId(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(SESSION_ID_KEY);
  } catch (error) {
    logger.warn('Unable to clear session ID from localStorage', { error });
  }
}

/**
 * Checks if a session ID exists in localStorage
 */
export function hasSessionId(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem(SESSION_ID_KEY) !== null;
  } catch {
    return false;
  }
}
