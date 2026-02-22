/**
 * Consolidation Engine
 * Implements rule-based memory consolidation from hierarchical-memory.json
 */

import { HierarchicalMemory, MemoryEntry } from './hierarchical-memory';

export interface ConsolidationRule {
  readonly name: string;
  readonly condition: string;
  readonly action: string;
}

export interface ConsolidationResult {
  readonly promoted: number;
  readonly logged: number;
  readonly skipped: number;
  readonly errors: ReadonlyArray<{ key: string; error: string }>;
}

export class ConsolidationEngine {
  constructor(
    private readonly memory: HierarchicalMemory,
    private readonly rules: readonly ConsolidationRule[]
  ) {}

  async evaluate(entry: MemoryEntry): Promise<void> {
    for (const rule of this.rules) {
      try {
        const shouldApply = this.evaluateCondition(rule.condition, entry);
        if (shouldApply) {
          await this.executeAction(rule.action, entry);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.debug(`[ConsolidationEngine] Rule "${rule.name}" failed for key "${entry.key}":`, errorMessage);
      }
    }
  }

  async runConsolidation(): Promise<ConsolidationResult> {
    const entries = this.memory.getShortTermEntries();
    let promoted = 0;
    let logged = 0;
    let skipped = 0;
    const errors: Array<{ key: string; error: string }> = [];

    for (const entry of entries) {
      try {
        const beforeLayer = entry.layer;
        await this.evaluate(entry);

        // Check if entry was promoted (no longer in short-term)
        const stillInShortTerm = this.memory.getShortTermEntries()
          .some(e => e.key === entry.key);

        if (!stillInShortTerm && beforeLayer === 'short-term') {
          promoted++;
        } else if (entry.metadata?.episodic) {
          logged++;
        } else {
          skipped++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ key: entry.key, error: errorMessage });
        skipped++;
      }
    }

    return {
      promoted,
      logged,
      skipped,
      errors,
    };
  }

  private evaluateCondition(condition: string, entry: MemoryEntry): boolean {
    // Parse simple conditions
    // Format: "field op value [AND/OR field op value]"
    const tokens = condition.split(/\s+/);
    let result = false;
    let operator = 'AND';

    for (let i = 0; i < tokens.length; i += 3) {
      if (tokens[i] === 'AND' || tokens[i] === 'OR') {
        operator = tokens[i];
        i -= 2; // Adjust for next iteration
        continue;
      }

      const field = tokens[i];
      const op = tokens[i + 1];
      const value = tokens[i + 2];

      const conditionMet = this.evaluateSingleCondition(field, op, value, entry);

      if (operator === 'AND') {
        result = i === 0 ? conditionMet : result && conditionMet;
      } else {
        result = result || conditionMet;
      }
    }

    return result;
  }

  private evaluateSingleCondition(
    field: string,
    op: string,
    value: string,
    entry: MemoryEntry
  ): boolean {
    const fieldValue = this.getFieldValue(field, entry);

    switch (op) {
      case '>=':
        return Number(fieldValue) >= Number(value);
      case '<=':
        return Number(fieldValue) <= Number(value);
      case '>':
        return Number(fieldValue) > Number(value);
      case '<':
        return Number(fieldValue) < Number(value);
      case '==':
        return String(fieldValue).replace(/['"]/g, '') === value.replace(/['"]/g, '');
      case '!=':
        return String(fieldValue).replace(/['"]/g, '') !== value.replace(/['"]/g, '');
      default:
        return false;
    }
  }

  private getFieldValue(field: string, entry: MemoryEntry): unknown {
    switch (field) {
      case 'layer':
        return entry.layer;
      case 'importance':
        return entry.metadata?.importance ?? 0;
      case 'type':
        return entry.metadata?.type ?? '';
      default:
        return entry.metadata?.[field];
    }
  }

  private async executeAction(action: string, entry: MemoryEntry): Promise<void> {
    // Parse action
    // Format: "promote to long-term" or "promote to long-term with tags[...]" or "log to episodic"

    if (action.includes('promote to long-term')) {
      await this.promoteToLongTerm(entry, action);
    } else if (action.includes('log to episodic')) {
      await this.logToEpisodic(entry);
    }
  }

  private async promoteToLongTerm(entry: MemoryEntry, action: string): Promise<void> {
    // Extract tags if specified
    const tagsMatch = action.match(/tags\[([^\]]+)\]/);
    const tags = tagsMatch
      ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''))
      : [];

    const metadata = {
      ...entry.metadata,
      tags: [...(entry.metadata?.tags as string[] ?? []), ...tags],
      promotedAt: new Date().toISOString(),
    };

    await this.memory.promote(entry.key, 'short-term', 'long-term');
  }

  private async logToEpisodic(entry: MemoryEntry): Promise<void> {
    // Store in long-term with episodic tag
    const metadata = {
      ...entry.metadata,
      episodic: true,
      loggedAt: new Date().toISOString(),
    };

    await this.memory.store(entry.key, entry.content, 'long-term', metadata);
  }
}
