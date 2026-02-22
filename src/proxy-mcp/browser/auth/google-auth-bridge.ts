/**
 * Google Auth Bridge
 * Wraps google-auth-system's GoogleAuthManager for CDP integration
 *
 * Authentication levels (1-5 fallback):
 * Level 1: Stored session cookies
 * Level 2: Browser profile with saved login
 * Level 3: OAuth token refresh
 * Level 4: Automated login with saved credentials
 * Level 5: Manual/human-assisted login
 */

import { AuthConfig, AuthResult, AuthLevel, DEFAULT_AUTH_CONFIG } from './types';

export class GoogleAuthBridge {
  private config: AuthConfig;
  private authManager: any | null = null;
  private currentLevel: AuthLevel = 1;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
  }

  /**
   * Initialize the auth manager (lazy load google-auth-system)
   */
  private async initAuthManager(): Promise<void> {
    if (this.authManager) return;

    try {
      const authModule = await import('google-auth-system');
      this.authManager = new authModule.GoogleAuthManager({
        email: this.config.email,
        storageDir: this.config.storageDir,
        headless: this.config.headless,
        timeout: this.config.timeout,
      });
    } catch (error) {
      throw new Error(
        'google-auth-system not installed. Run: npm install google-auth-system\n' +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Authenticate with fallback through levels 1-5
   */
  async authenticate(): Promise<AuthResult> {
    await this.initAuthManager();

    for (let level = 1 as AuthLevel; level <= 5; level++) {
      try {
        const result = await this.tryLevel(level);
        if (result.success) {
          this.currentLevel = level;
          return result;
        }
      } catch (error) {
        console.debug(`[GoogleAuth] Level ${level} failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    return {
      success: false,
      level: 5,
      error: 'All authentication levels exhausted',
      sessionValid: false,
    };
  }

  /**
   * Try authentication at a specific level
   */
  private async tryLevel(level: AuthLevel): Promise<AuthResult> {
    if (!this.authManager) {
      return { success: false, level, error: 'Auth manager not initialized', sessionValid: false };
    }

    try {
      const result = await this.authManager.authenticate({ level });
      return {
        success: result.success ?? false,
        level,
        email: result.email || this.config.email,
        sessionValid: result.sessionValid ?? false,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        level,
        error: error instanceof Error ? error.message : String(error),
        sessionValid: false,
      };
    }
  }

  /**
   * Get an authenticated Playwright page
   */
  async getAuthenticatedPage(): Promise<any> {
    await this.initAuthManager();

    if (!this.authManager) {
      throw new Error('Auth manager not initialized');
    }

    const authResult = await this.authenticate();
    if (!authResult.success) {
      throw new Error(`Authentication failed: ${authResult.error}`);
    }

    return this.authManager.getPage();
  }

  /**
   * Verify current session is still valid
   */
  async verifySession(): Promise<boolean> {
    if (!this.authManager) return false;

    try {
      const result = await this.authManager.verifySession();
      return result?.valid ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Get current auth level
   */
  getCurrentLevel(): AuthLevel {
    return this.currentLevel;
  }

  /**
   * Get config (without sensitive data)
   */
  getConfig(): Omit<AuthConfig, 'email'> & { email: string } {
    return {
      ...this.config,
      email: this.config.email ? `${this.config.email.slice(0, 3)}***` : '',
    };
  }
}
