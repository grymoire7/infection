import { LevelDefinition } from './GameStateManager';

export class Level {
    private definition: LevelDefinition;
    private nextLevel: Level | null = null;
    private previousLevel: Level | null = null;
    private aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
    private index: number;

    constructor(definition: LevelDefinition, aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy', index: number = 0) {
        this.definition = definition;
        this.aiDifficulty = aiDifficulty;
        this.index = index;
    }

    /**
     * Get the level definition data
     */
    getDefinition(): LevelDefinition {
        return this.definition;
    }

    getIndex(): number {
        return this.index;
    }

    /**
     * Get the level ID
     */
    getId(): string {
        return this.definition.id;
    }

    /**
     * Get the level name
     */
    getName(): string {
        return this.definition.name;
    }

    /**
     * Get the level description
     */
    getDescription(): string {
        return this.definition.description;
    }

    /**
     * Get the grid size for this level
     */
    getGridSize(): number {
        return this.definition.gridSize;
    }

    /**
     * Get the blocked cells for this level
     */
    getBlockedCells(): { row: number; col: number }[] {
        return this.definition.blockedCells;
    }

    /**
     * Get the AI difficulty for this level
     */
    getAIDifficulty(): 'easy' | 'medium' | 'hard' | 'expert' {
        return this.aiDifficulty;
    }

    /**
     * Set the AI difficulty for this level
     */
    setAIDifficulty(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): void {
        this.aiDifficulty = difficulty;
    }

    /**
     * Get the next level in the set, or null if this is the last level
     */
    next(): Level | null {
        return this.nextLevel;
    }

    /**
     * Get the previous level in the set, or null if this is the first level
     */
    previous(): Level | null {
        return this.previousLevel;
    }

    /**
     * Set the next level in the linked list (internal use)
     */
    setNext(level: Level | null): void {
        this.nextLevel = level;
    }

    /**
     * Set the previous level in the linked list (internal use)
     */
    setPrevious(level: Level | null): void {
        this.previousLevel = level;
    }

    /**
     * Check if this is the first level in the set
     */
    isFirst(): boolean {
        return this.previousLevel === null;
    }

    /**
     * Check if this is the last level in the set
     */
    isLast(): boolean {
        return this.nextLevel === null;
    }
}
