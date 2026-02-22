/**
 * Stealth Browser Types
 *
 * Type definitions for stealth browser features:
 * - Patchright (undetectable Playwright fork)
 * - fingerprint-generator (realistic fingerprints)
 * - Human behavior simulation
 */

export interface StealthConfig {
  readonly usePatchright: boolean;
  readonly useFingerprint: boolean;
  readonly humanBehavior: boolean;
  readonly randomDelays: {
    readonly min: number;
    readonly max: number;
  };
}

export interface FingerprintProfile {
  readonly userAgent: string;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
  };
  readonly locale: string;
  readonly timezone: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly screen?: {
    readonly width: number;
    readonly height: number;
    readonly availWidth: number;
    readonly availHeight: number;
    readonly colorDepth: number;
    readonly pixelDepth: number;
  };
  readonly webGLVendor?: string;
  readonly webGLRenderer?: string;
  readonly platform?: string;
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
}

export const DEFAULT_STEALTH_CONFIG: StealthConfig = {
  usePatchright: true,
  useFingerprint: true,
  humanBehavior: true,
  randomDelays: { min: 100, max: 500 },
};
