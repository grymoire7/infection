import { LevelSetDefinition } from './GameStateManager';
import { Level } from './Level';
import { LEVELS } from './LevelDefinitions';

export class LevelSet {
    private definition: LevelSetDefinition;
    private levels: Level[] = [];
    private firstLevel: Level;
    private lastLevel: Level;
    private currentLevel: Level;

    constructor(definition: LevelSetDefinition) {
        this.definition = definition;
        this.initializeLevels();
    }

    /**
     * Initialize the levels from the definition and create the linked list
     */
    private initializeLevels(): void {
        let index = 0;

        // Create Level instances from the definition
        for (const entry of this.definition.levelEntries) {
            const levelDefinition = LEVELS[entry.levelId];
            if (levelDefinition) {
                const level = new Level(levelDefinition, entry.aiDifficulty, index);
                this.levels.push(level);
                index++;
            } else {
                console.warn(`Level definition not found for ID: ${entry.levelId}`);
            }
        }

        // Link the levels together
        this.linkLevels();
    }

    /**
     * Create the linked list structure between levels
     */
    private linkLevels(): void {
        if (this.levels.length === 0) return;

        this.firstLevel = this.levels[0];
        this.currentLevel = this.firstLevel;
        this.lastLevel = this.levels[this.levels.length - 1];

        for (let i = 0; i < this.levels.length; i++) {
            const currentLevel = this.levels[i];
            const nextLevel = i < this.levels.length - 1 ? this.levels[i + 1] : null;
            const previousLevel = i > 0 ? this.levels[i - 1] : null;

            currentLevel.setNext(nextLevel);
            currentLevel.setPrevious(previousLevel);
        }
    }

    getCurrentLevel(): Level {
        return this.currentLevel || this.firstLevel;
    }

    setCurrentLevel(level: Level): boolean {
        const foundLevel = this.levels.find(l => l.getId() === level.getId());
        if (foundLevel) {
            this.currentLevel = foundLevel;
            return true;
        }
        return false;
    }

    nextLevel(): Level | null {
        const nextLevel = this.currentLevel.next();
        if (!nextLevel) return null;

        this.currentLevel = nextLevel;
        return this.currentLevel
    }


    /**
     * Get the level set definition
     */
    getDefinition(): LevelSetDefinition {
        return this.definition;
    }

    /**
     * Get the level set ID
     */
    getId(): string {
        return this.definition.id;
    }

    /**
     * Get the level set name
     */
    getName(): string {
        return this.definition.name;
    }

    /**
     * Get the level set description
     */
    getDescription(): string {
        return this.definition.description;
    }

    /**
     * Get the first level in the set
     */
    first(): Level {
        return this.firstLevel;
    }

    /**
     * Get the last level in the set
     */
    last(): Level | null {
        return this.lastLevel;
    }

    /**
     * Get the level at the specified index
     */
    getLevel(index: number): Level | null {
        if (index < 0 || index >= this.levels.length) {
            return null;
        }
        return this.levels[index];
    }

    /**
     * Get the level by ID
     */
    getLevelById(levelId: string): Level | null {
        return this.levels.find(level => level.getId() === levelId) || null;
    }

    /**
     * Get the index of a level in the set
     */
    getLevelIndex(level: Level): number {
        return this.levels.findIndex(l => l.getId() === level.getId());
    }

    /**
     * Get the total number of levels in the set
     */
    getLength(): number {
        return this.levels.length;
    }

    /**
     * Get all levels as an array
     */
    getAllLevels(): Level[] {
        return [...this.levels];
    }

    /**
     * Check if the level set is empty
     */
    isEmpty(): boolean {
        return this.levels.length === 0;
    }

    /**
     * Check if a level exists in this set
     */
    hasLevel(levelId: string): boolean {
        return this.levels.some(level => level.getId() === levelId);
    }
}
