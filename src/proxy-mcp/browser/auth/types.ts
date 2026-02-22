/**
 * Google Auth Bridge - Type Definitions
 */

export type AuthLevel = 1 | 2 | 3 | 4 | 5;

export interface AuthConfig {
  email: string;
  storageDir: string;
  headless: boolean;
  maxRetries: number;
  timeout: number;
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  email: process.env.GOOGLE_AUTH_EMAIL || '',
  storageDir: process.env.GOOGLE_AUTH_STORAGE_DIR || './data/auth-storage',
  headless: false,
  maxRetries: 3,
  timeout: 30000,
};

export interface AuthResult {
  success: boolean;
  level: AuthLevel;
  email?: string;
  error?: string;
  sessionValid: boolean;
  expiresAt?: string;
}
