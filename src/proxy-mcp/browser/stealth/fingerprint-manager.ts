/**
 * Fingerprint Manager
 *
 * Generates and manages realistic browser fingerprints using fingerprint-generator.
 * Caches fingerprints for session reuse to maintain consistency.
 */

import { FingerprintProfile } from './types';

/**
 * Fingerprint Manager
 *
 * Generates realistic browser fingerprints and provides them as
 * Playwright context options for stealth browsing.
 */
export class FingerprintManager {
  private cached: FingerprintProfile | null = null;
  private generator: unknown = null;

  constructor() {
    // Generator will be lazily initialized
  }

  /**
   * Generate a new realistic fingerprint
   */
  public generate(): FingerprintProfile {
    try {
      // Dynamic import to allow graceful fallback if package not installed
      const { FingerprintGenerator } = require('fingerprint-generator');

      if (!this.generator) {
        this.generator = new FingerprintGenerator();
      }

      const rawFingerprint = (this.generator as any).getFingerprint({
        devices: ['desktop'],
        operatingSystems: ['macos', 'windows', 'linux'],
        browsers: ['chrome', 'edge'],
        locales: ['en-US', 'en-GB', 'ja-JP'],
      });

      // Transform to our FingerprintProfile format
      const profile: FingerprintProfile = {
        userAgent: rawFingerprint.fingerprint.navigator.userAgent,
        viewport: {
          width: rawFingerprint.fingerprint.screen.width,
          height: rawFingerprint.fingerprint.screen.height,
        },
        locale: rawFingerprint.fingerprint.navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        headers: {
          'accept-language': rawFingerprint.fingerprint.navigator.language,
          'user-agent': rawFingerprint.fingerprint.navigator.userAgent,
        },
        screen: {
          width: rawFingerprint.fingerprint.screen.width,
          height: rawFingerprint.fingerprint.screen.height,
          availWidth: rawFingerprint.fingerprint.screen.availWidth || rawFingerprint.fingerprint.screen.width,
          availHeight: rawFingerprint.fingerprint.screen.availHeight || rawFingerprint.fingerprint.screen.height,
          colorDepth: rawFingerprint.fingerprint.screen.colorDepth || 24,
          pixelDepth: rawFingerprint.fingerprint.screen.pixelDepth || 24,
        },
        platform: rawFingerprint.fingerprint.navigator.platform,
        deviceMemory: rawFingerprint.fingerprint.navigator.deviceMemory,
        hardwareConcurrency: rawFingerprint.fingerprint.navigator.hardwareConcurrency,
        webGLVendor: rawFingerprint.fingerprint.videoCard?.vendor,
        webGLRenderer: rawFingerprint.fingerprint.videoCard?.renderer,
      };

      this.cached = profile;
      return profile;
    } catch (error) {
      console.warn(
        '[FingerprintManager] fingerprint-generator not available, using fallback profile:',
        error instanceof Error ? error.message : String(error)
      );
      return this.generateFallbackProfile();
    }
  }

  /**
   * Get cached fingerprint or generate new one
   */
  public getCached(): FingerprintProfile {
    if (!this.cached) {
      return this.generate();
    }
    return this.cached;
  }

  /**
   * Convert fingerprint to Playwright context options
   */
  public getContextOptions(): {
    userAgent: string;
    viewport: { width: number; height: number };
    locale: string;
    timezoneId: string;
    extraHTTPHeaders: Record<string, string>;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
  } {
    const profile = this.getCached();

    return {
      userAgent: profile.userAgent,
      viewport: profile.viewport,
      locale: profile.locale,
      timezoneId: profile.timezone,
      extraHTTPHeaders: profile.headers as Record<string, string>,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    };
  }

  /**
   * Clear cached fingerprint (force regeneration on next call)
   */
  public clearCache(): void {
    this.cached = null;
  }

  /**
   * Generate fallback profile when fingerprint-generator is not available
   */
  private generateFallbackProfile(): FingerprintProfile {
    const profiles: FingerprintProfile[] = [
      {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezone: 'America/New_York',
        headers: {
          'accept-language': 'en-US,en;q=0.9',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
        screen: {
          width: 1920,
          height: 1080,
          availWidth: 1920,
          availHeight: 1055,
          colorDepth: 24,
          pixelDepth: 24,
        },
        platform: 'MacIntel',
        deviceMemory: 8,
        hardwareConcurrency: 8,
      },
      {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezone: 'America/Los_Angeles',
        headers: {
          'accept-language': 'en-US,en;q=0.9',
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
        screen: {
          width: 1920,
          height: 1080,
          availWidth: 1920,
          availHeight: 1040,
          colorDepth: 24,
          pixelDepth: 24,
        },
        platform: 'Win32',
        deviceMemory: 8,
        hardwareConcurrency: 12,
      },
    ];

    // Randomly select a fallback profile
    const profile = profiles[Math.floor(Math.random() * profiles.length)];
    this.cached = profile;
    return profile;
  }
}
