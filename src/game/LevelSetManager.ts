import { Level } from './Level';
import { LevelSet } from './LevelSet';
import { LEVEL_SETS } from './LevelDefinitions';

export class LevelSetManager {
    private levelSets: Map<string, LevelSet> = new Map();
    private gameRegistry: Phaser.Data.DataManager;

    constructor(gameRegistry: Phaser.Data.DataManager) {
        this.gameRegistry = gameRegistry;
        this.initializeLevelSets();
    }

    /**
     * Initialize all level sets from the definitions
     */
    private initializeLevelSets(): void {
        for (const levelSetDefinition of LEVEL_SETS) {
            const levelSet = new LevelSet(levelSetDefinition);
            this.levelSets.set(levelSetDefinition.id, levelSet);
        }
    }

    /**
     * Get the level that should be loaded next
     * This could be the next level in the set, or the first level if starting fresh
     */
    getLevelToLoad(): Level {
        const shouldLoadNextLevel = this.gameRegistry.get('loadNextLevel') === true;
        this.gameRegistry.remove('loadNextLevel');

        if (shouldLoadNextLevel) {
            return this.getNextLevel();
        } else {
            return this.getFirstLevelOfCurrentSet();
        }
    }

    /**
     * Get the first level of the current level set
     */
    getFirstLevelOfCurrentSet(): Level {
        const currentLevelSet = this.getCurrentLevelSet();
        const firstLevel = currentLevelSet.first();
        currentLevelSet.setCurrentLevel(firstLevel);
        return firstLevel;
    }

    /**
     * Get the next level in the current level set
     */
    private getNextLevel(): Level {
        const currentLevelSet = this.getCurrentLevelSet();
        const nextLevel = currentLevelSet.nextLevel();

        if (nextLevel) {
            return nextLevel;
        } else {
            // Fallback to first level if no next level
            console.warn('No next level available, returning first level of set');
            return this.getFirstLevelOfCurrentSet();
        }
    }

    /**
     * Check if the level set has changed and needs to be reloaded
     */
    hasLevelSetChanged(): boolean {
        const levelSetDirty = this.gameRegistry.get('levelSetDirty') === true;
        if (levelSetDirty) {
            this.gameRegistry.remove('levelSetDirty');
        }
        return levelSetDirty;
    }

    getCurrentLevel(): Level | null {
        const currentLevelSet = this.getCurrentLevelSet();
        return currentLevelSet.getCurrentLevel();
    }

    setCurrentLevel(level: Level): boolean {
        const currentLevelSet = this.getCurrentLevelSet();
        if (currentLevelSet && currentLevelSet.getLevelById(level.getId())) {
            currentLevelSet.setCurrentLevel(level);
            return true;
        }
        return false;
    }

    /**
     * Get the current level set based on registry settings
     */
    getCurrentLevelSet(): LevelSet {
        // First check if we have a currentLevelSet in the registry
        let currentLevelSet = this.gameRegistry.get('currentLevelSet');

        // If not, try to load by levelSetId from registry
        if (!currentLevelSet) {
            const levelSetId = this.gameRegistry.get('levelSetId');
            if (levelSetId) {
                currentLevelSet = this.getLevelSet(levelSetId);
                // Cache it in the registry for future use
                if (currentLevelSet) {
                    this.gameRegistry.set('currentLevelSet', currentLevelSet);
                }
            }
        }

        // Fall back to default if we still don't have a level set
        if (!currentLevelSet) {
            currentLevelSet = this.getDefaultLevelSet();
            this.gameRegistry.set('currentLevelSet', currentLevelSet);
        }

        console.log('LevelSetManager.getCurrentLevelSet:', currentLevelSet);
        return currentLevelSet;
    }

    /**
     * Get a level set by ID
     */
    getLevelSet(levelSetId: string): LevelSet | null {
        return this.levelSets.get(levelSetId) || null;
    }

    /**
     * Get all available level sets
     */
    getAllLevelSets(): LevelSet[] {
        return Array.from(this.levelSets.values());
    }

    /**
     * Get all level set IDs
     */
    getLevelSetIds(): string[] {
        return Array.from(this.levelSets.keys());
    }

    /**
     * Check if a level set exists
     */
    hasLevelSet(levelSetId: string): boolean {
        return this.levelSets.has(levelSetId);
    }

    /**
     * Set the current level set in the registry
     */
    setCurrentLevelSet(levelSet: LevelSet): boolean {
        if (levelSet) {
            this.gameRegistry.set('currentLevelSet', levelSet);
            return true;
        }
        return false;
    }

    setCurrentLevelSetById(levelSetId: string): boolean {
        const levelSet = this.getLevelSet(levelSetId) || this.getDefaultLevelSet();
        return this.setCurrentLevelSet(levelSet);
    }

    /**
     * Get the default level set
     */
    getDefaultLevelSet(): LevelSet {
        return this.getLevelSet('default') || this.getAllLevelSets()[0];
    }

    /**
     * Reload level sets from definitions (useful for hot-reloading)
     */
    reloadLevelSets(): void {
        this.levelSets.clear();
        this.initializeLevelSets();
    }

    /**
     * Get level set statistics
     */
    getLevelSetStats(levelSetId: string): { totalLevels: number; difficulties: Record<string, number> } | null {
        const levelSet = this.getLevelSet(levelSetId);
        if (!levelSet) return null;

        const levels = levelSet.getAllLevels();
        const difficulties: Record<string, number> = {};

        for (const level of levels) {
            const difficulty = level.getAIDifficulty();
            difficulties[difficulty] = (difficulties[difficulty] || 0) + 1;
        }

        return {
            totalLevels: levels.length,
            difficulties
        };
    }
}