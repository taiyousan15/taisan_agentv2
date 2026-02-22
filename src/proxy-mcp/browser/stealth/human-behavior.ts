/**
 * Human Behavior Simulation
 *
 * Simulates human-like browser interactions to avoid detection:
 * - Random delays between actions
 * - Natural scrolling patterns
 * - Human-like typing with variable speed
 */

import type { Page } from 'playwright-core';

/**
 * Random delay with human-like variance
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Human-like scrolling behavior
 *
 * Scrolls page in a natural way with random pauses.
 * Simulates reading behavior.
 */
export async function humanScroll(page: Page): Promise<void> {
  try {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    // Scroll in chunks with random delays
    const numScrolls = Math.floor(scrollHeight / viewportHeight) + 1;
    const scrollsToPerform = Math.min(numScrolls, 5); // Max 5 scrolls

    for (let i = 0; i < scrollsToPerform; i++) {
      const scrollAmount = Math.floor(viewportHeight * (0.6 + Math.random() * 0.4));

      await page.evaluate((amount) => {
        window.scrollBy({
          top: amount,
          behavior: 'smooth',
        });
      }, scrollAmount);

      // Random pause between scrolls (simulating reading)
      await randomDelay(300, 800);
    }
  } catch (error) {
    console.debug(
      '[HumanBehavior] Scroll failed:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Human-like typing behavior
 *
 * Types text with variable speed and occasional pauses.
 * Simulates natural typing patterns.
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  try {
    await page.click(selector);
    await randomDelay(100, 300);

    // Type character by character with variable delays
    for (const char of text) {
      await page.keyboard.type(char);

      // Variable typing speed (faster for common chars, slower for special chars)
      const isSpecialChar = /[^a-zA-Z0-9\s]/.test(char);
      const baseDelay = isSpecialChar ? 150 : 50;
      const variance = Math.random() * 100;

      await randomDelay(baseDelay, baseDelay + variance);

      // Occasional longer pause (simulating thinking)
      if (Math.random() < 0.1) {
        await randomDelay(300, 700);
      }
    }
  } catch (error) {
    console.debug(
      '[HumanBehavior] Type failed:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Random mouse movement
 *
 * Moves mouse to random positions on the page to simulate human presence.
 */
export async function humanMouseMovement(page: Page): Promise<void> {
  try {
    const viewport = page.viewportSize();
    if (!viewport) return;

    const numMoves = Math.floor(Math.random() * 3) + 1; // 1-3 moves

    for (let i = 0; i < numMoves; i++) {
      const x = Math.floor(Math.random() * viewport.width);
      const y = Math.floor(Math.random() * viewport.height);

      await page.mouse.move(x, y, {
        steps: Math.floor(Math.random() * 10) + 5, // 5-15 steps
      });

      await randomDelay(100, 400);
    }
  } catch (error) {
    console.debug(
      '[HumanBehavior] Mouse movement failed:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Simulate page reading behavior
 *
 * Combines scroll and mouse movements to simulate reading a page.
 */
export async function simulateReading(page: Page): Promise<void> {
  await randomDelay(500, 1000);
  await humanMouseMovement(page);
  await randomDelay(300, 600);
  await humanScroll(page);
  await randomDelay(200, 500);
  await humanMouseMovement(page);
}
