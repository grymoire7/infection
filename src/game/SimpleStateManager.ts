import { Logger } from './ErrorLogger';

/**
 * Minimal state debugging enhancement that builds on Phaser's built-in Data Manager
 *
 * This adds just source tracking and basic validation without complex caching layers.
 * Use this when debugging state-related bugs - disable in production for performance.
 */
export class SimpleStateManager {
    private registry: Phaser.Data.DataManager;
    private changeHistory: Array<{
        timestamp: number;
        key: string;
        oldValue: any;
        newValue: any;
        source: string;
    }> = [];
    private maxHistory: number = 20; // Keep small history for debugging

    constructor(registry: Phaser.Data.DataManager) {
        this.registry = registry;
    }

    /**
     * Set a value with source tracking for debugging
     *
     * @param key - Registry key
     * @param value - Value to set
     * @param source - Where this change originated (for debugging)
     */
    set(key: string, value: any, source = 'unknown'): void {
        const oldValue = this.registry.get(key);

        // Track the change before setting
        this.changeHistory.push({
            timestamp: Date.now(),
            key,
            oldValue,
            newValue: value,
            source
        });

        // Limit history size
        if (this.changeHistory.length > this.maxHistory) {
            this.changeHistory.shift();
        }

        // Use Phaser's built-in set method
        this.registry.set(key, value);
    }

    /**
     * Get recent changes for debugging
     *
     * @param key - Optional key to filter by
     * @param limit - Maximum number of changes to return
     */
    getRecentChanges(key?: string, limit = 10): Array<any> {
        let history = this.changeHistory;

        if (key) {
            history = history.filter(change => change.key === key);
        }

        return history.slice(-limit).reverse();
    }

    /**
     * Print recent changes to console for debugging
     */
    dumpRecentChanges(key?: string): void {
        const changes = this.getRecentChanges(key);

        if (changes.length === 0) {
            Logger.info(`No recent changes${key ? ` for key "${key}"` : ''}`);
            return;
        }

        Logger.info(`Recent state changes${key ? ` for "${key}"` : ''}:`);
        changes.forEach(change => {
            const time = new Date(change.timestamp).toLocaleTimeString();
            Logger.info(`  ${time}: ${change.key} = ${change.newValue} (from ${change.oldValue}) [${change.source}]`);
        });
    }

    /**
     * Clear change history
     */
    clearHistory(): void {
        this.changeHistory = [];
    }

    /**
     * Get simple metrics
     */
    getMetrics() {
        return {
            changeHistorySize: this.changeHistory.length,
            totalKeys: Object.keys(this.registry.values).length
        };
    }
}