import { Level } from './Level';
import { LevelSet } from './LevelSet';
import { LEVEL_SETS } from './LevelDefinitions';

export class LevelSetManager {
    private levelSets: Map<string, LevelSet> = new Map();
    private gameRegistry: Phaser.Data.DataManager;
    private loadLevelMethod: ((level: Level) => void) | undefined;

    constructor(gameRegistry: Phaser.Data.DataManager, loadLevelMethod?: (level: Level) => void) {
        this.gameRegistry = gameRegistry;
        this.loadLevelMethod = loadLevelMethod;
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

    private loadLevel(level: Level): void {
        if (this.loadLevelMethod) {
            this.loadLevelMethod(level);
        } else {
            console.warn('No loadLevelMethod provided to LevelSetManager.');
        }
    }

    // clalled by game.wake and game.loadGameStateOrLevel
    loadNewLevel(): void {
        const shouldLoadNextLevel = (this.gameRegistry.get('loadNextLevel') === true);
        console.log('LevelSetManager.loadNewLevel(): shouldLoadNextLevel = ', shouldLoadNextLevel);
        
        if (shouldLoadNextLevel) {
            this.loadNextLevel();
        } else {
            this.loadFirstLevelOfSet();
        }

        this.gameRegistry.remove('loadNextLevel');
    }

    // used by game.realoadAllSettings
    handleLevelSetDirty(): void {
        const levelSetDirty = this.gameRegistry.get('levelSetDirty');
        if (levelSetDirty) {
            this.gameRegistry.remove('levelSetDirty');
            this.loadFirstLevelOfSet();
        }
    }

    // used by loadNewLevel, loadNextLevel, and handleLevelSetDirty
    private loadFirstLevelOfSet(): void {
        const currentLevelSet = this.getCurrentLevelSet();
        
        const firstLevel = currentLevelSet.first();
        currentLevelSet.setCurrentLevel(firstLevel);
        this.loadLevel(firstLevel);
    }
    
    // used only by loadNewLevel
    private loadNextLevel(): void {
        const currentLevelSet = this.getCurrentLevelSet();
        const nextLevel = currentLevelSet.nextLevel();
        
        console.log('Loading next level for level set:', currentLevelSet.getId());
        
        if (nextLevel) {
            this.loadLevel(nextLevel);
        } else {
            console.log(`WARN: We should ever get here. No next level when loadNextLevel is called.`);
            this.loadFirstLevelOfSet();
        }
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
        const currentLevelSet = this.gameRegistry.get('currentLevelSet') || this.getDefaultLevelSet();
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