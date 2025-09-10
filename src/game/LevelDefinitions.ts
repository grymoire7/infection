import { Level, LevelSet } from './GameStateManager';

// Define all levels separately
export const LEVELS: Record<string, Level> = {
    'level-1': {
        id: 'level-1',
        name: 'Beginner\'s Grid',
        description: 'A simple 5x5 grid to get started',
        gridSize: 5,
        blockedCells: []
    },
    'level-2': {
        id: 'level-2',
        name: 'Edge Challenge',
        description: 'Focus on edge strategies',
        gridSize: 5,
        blockedCells: [
            { row: 0, col: 2 },
            { row: 2, col: 0 }, { row: 2, col: 4 },
            { row: 4, col: 2 }
        ]
    },
    'level-3': {
        id: 'level-3',
        name: 'Corner Tactics',
        description: 'Master corner control',
        gridSize: 5,
        blockedCells: [
            { row: 1, col: 1 }, { row: 1, col: 3 },
            { row: 3, col: 1 }, { row: 3, col: 3 }
        ]
    },
    'advanced-1': {
        id: 'advanced-1',
        name: 'The Cross',
        description: 'A grid with a central blocked cross',
        gridSize: 5,
        blockedCells: [
            { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
            { row: 1, col: 2 }, { row: 3, col: 2 }
        ]
    },
    'advanced-2': {
        id: 'advanced-2',
        name: 'Sparkle',
        description: 'A grid with sparkle blocks',
        gridSize: 5,
        blockedCells: [
            { row: 0, col: 2 }, { row: 1, col: 2 },
            { row: 2, col: 0 }, { row: 2, col: 4 },
            { row: 3, col: 2 }, { row: 4, col: 2 }
        ]
    }
};

// Sample level sets
export const BASIC_LEVEL_SET: LevelSet = {
    id: 'default',
    name: 'Basic Levels',
    description: 'The standard set of levels to learn and master the game',
    levelEntries: [
        { levelId: 'level-1', aiDifficulty: 'easy' },
        { levelId: 'level-2', aiDifficulty: 'easy' },
        { levelId: 'level-3', aiDifficulty: 'medium' }
    ]
};

export const ADVANCED_LEVEL_SET: LevelSet = {
    id: 'advanced',
    name: 'Advanced Levels',
    description: 'Challenging levels for experienced players',
    levelEntries: [
        { levelId: 'advanced-1', aiDifficulty: 'hard' },
        { levelId: 'advanced-2', aiDifficulty: 'expert' }
    ]
};

export const LEVEL_SETS: LevelSet[] = [
    BASIC_LEVEL_SET,
    ADVANCED_LEVEL_SET
];

// Helper function to get a level by ID
export function getLevelById(levelId: string): Level | undefined {
    return LEVELS[levelId];
}

// Helper function to get levels for a level set
export function getLevelsForSet(levelSet: LevelSet): Level[] {
    return levelSet.levelEntries.map(entry => LEVELS[entry.levelId]).filter(Boolean) as Level[];
}

// Helper function to get AI difficulty for a specific level in a level set
export function getAIDifficultyForLevel(levelSetId: string, levelId: string): 'easy' | 'medium' | 'hard' | 'expert' {
    const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
    if (!levelSet) {
        return 'easy'; // Default fallback
    }
    
    const levelEntry = levelSet.levelEntries.find(entry => entry.levelId === levelId);
    return levelEntry ? levelEntry.aiDifficulty : 'easy';
}
