/**
 * Stealth CDP Session
 *
 * Enhanced CDP connection using Patchright + fingerprint injection.
 * Falls back gracefully to standard playwright-core if unavailable.
 */

import type { Browser, BrowserContext } from 'playwright-core';
import { CDPConfig, CDPConnection, DEFAULT_CDP_CONFIG } from '../cdp/types';
import { StealthConfig, DEFAULT_STEALTH_CONFIG } from './types';
import { FingerprintManager } from './fingerprint-manager';
import { isCDPPortOpen } from '../cdp/session';

/** Cached stealth connection */
let cachedStealthConnection: CDPConnection | null = null;

/** Fingerprint manager singleton */
const fingerprintManager = new FingerprintManager();

/**
 * Connect to Chrome via CDP with stealth features
 *
 * Features:
 * - Uses Patchright (undetectable Playwright fork) if available
 * - Injects realistic browser fingerprints
 * - Falls back to standard playwright-core gracefully
 *
 * @param config - CDP configuration
 * @param stealthConfig - Stealth features configuration
 */
export async function connectStealthCDP(
  config?: Partial<CDPConfig>,
  stealthConfig?: Partial<StealthConfig>
): Promise<CDPConnection> {
  const fullConfig = { ...DEFAULT_CDP_CONFIG, ...config };
  const fullStealthConfig = { ...DEFAULT_STEALTH_CONFIG, ...stealthConfig };

  // Return cached connection if still valid
  if (cachedStealthConnection?.isConnected) {
    try {
      await cachedStealthConnection.browser.contexts();
      return cachedStealthConnection;
    } catch (error) {
      console.debug(
        '[StealthCDP] Cached connection stale, reconnecting:',
        error instanceof Error ? error.message : String(error)
      );
      cachedStealthConnection = null;
    }
  }

  // Extract port from endpoint URL
  const portMatch = fullConfig.endpointUrl.match(/:(\d+)/);
  const port = portMatch ? parseInt(portMatch[1], 10) : 9222;

  // Check if Chrome is running
  const isOpen = await isCDPPortOpen(port);
  if (!isOpen) {
    throw new Error(
      `Chrome is not running on port ${port}. ` +
        'Start Chrome with: npm run chrome:debug:start'
    );
  }

  // Try to use Patchright if enabled
  let browser: Browser;
  let usedPatchright = false;

  if (fullStealthConfig.usePatchright) {
    try {
      const { chromium } = await import('patchright');
      browser = await chromium.connectOverCDP(fullConfig.endpointUrl, {
        timeout: fullConfig.timeout,
      });
      usedPatchright = true;
      console.debug('[StealthCDP] Connected using Patchright (stealth mode)');
    } catch (error) {
      console.warn(
        '[StealthCDP] Patchright not available, falling back to playwright-core:',
        error instanceof Error ? error.message : String(error)
      );
      // Fall through to playwright-core fallback
    }
  }

  // Fallback to standard playwright-core
  if (!browser!) {
    const { chromium } = await import('playwright-core');
    let attempts = 0;

    while (attempts < fullConfig.maxRetries) {
      try {
        browser = await chromium.connectOverCDP(fullConfig.endpointUrl, {
          timeout: fullConfig.timeout,
        });
        break;
      } catch (err) {
        attempts++;
        if (attempts >= fullConfig.maxRetries) {
          throw new Error(
            `Failed to connect to Chrome after ${fullConfig.maxRetries} attempts: ${err}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    console.debug('[StealthCDP] Connected using playwright-core (standard mode)');
  }

  // Get or create context
  const contexts = browser!.contexts();
  let context: BrowserContext;

  if (contexts.length > 0) {
    context = contexts[0];
    console.debug('[StealthCDP] Using existing browser context');
  } else {
    // Create new context with fingerprint if enabled
    if (fullStealthConfig.useFingerprint) {
      try {
        const contextOptions = fingerprintManager.getContextOptions();
        context = await browser!.newContext(contextOptions);
        console.debug('[StealthCDP] Created context with injected fingerprint');
      } catch (error) {
        console.warn(
          '[StealthCDP] Failed to inject fingerprint, using default context:',
          error instanceof Error ? error.message : String(error)
        );
        context = await browser!.newContext();
      }
    } else {
      context = await browser!.newContext();
      console.debug('[StealthCDP] Created context without fingerprint');
    }
  }

  cachedStealthConnection = {
    browser: browser!,
    context,
    isConnected: true,
  };

  // Handle disconnect
  browser!.on('disconnected', () => {
    if (cachedStealthConnection) {
      cachedStealthConnection.isConnected = false;
    }
  });

  // Log stealth features status
  const features: string[] = [];
  if (usedPatchright) features.push('Patchright');
  if (fullStealthConfig.useFingerprint) features.push('Fingerprint');
  if (fullStealthConfig.humanBehavior) features.push('HumanBehavior');

  console.debug(
    `[StealthCDP] Connection established with features: ${features.join(', ') || 'None'}`
  );

  return cachedStealthConnection;
}

/**
 * Get cached stealth connection if available
 */
export function getCachedStealthConnection(): CDPConnection | null {
  if (cachedStealthConnection?.isConnected) {
    return cachedStealthConnection;
  }
  return null;
}

/**
 * Disconnect stealth CDP connection
 */
export async function disconnectStealthCDP(): Promise<void> {
  if (cachedStealthConnection) {
    try {
      await cachedStealthConnection.browser.close();
    } catch (error) {
      console.debug(
        '[StealthCDP] Error during disconnect (non-fatal):',
        error instanceof Error ? error.message : String(error)
      );
    }
    cachedStealthConnection = null;
  }
}

/**
 * Clear stealth connection cache (for testing)
 */
export function clearStealthConnectionCache(): void {
  cachedStealthConnection = null;
}

/**
 * Regenerate fingerprint for next connection
 */
export function regenerateFingerprint(): void {
  fingerprintManager.clearCache();
  console.debug('[StealthCDP] Fingerprint cache cleared, will regenerate on next connection');
}
