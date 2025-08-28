import { Level, LevelSet } from './GameStateManager';

// Define all levels separately
export const LEVELS: Record<string, Level> = {
    'level-1': {
        id: 'level-1',
        name: 'Beginner\'s Grid',
        description: 'A simple 5x5 grid to get started',
        gridSize: 5,
        blockedCells: [],
        difficulty: 1
    },
    'level-2': {
        id: 'level-2',
        name: 'Edge Challenge',
        description: 'Focus on edge strategies',
        gridSize: 5,
        blockedCells: [],
        difficulty: 2
    },
    'level-3': {
        id: 'level-3',
        name: 'Corner Tactics',
        description: 'Master corner control',
        gridSize: 5,
        blockedCells: [],
        difficulty: 3
    },
    'advanced-1': {
        id: 'advanced-1',
        name: 'The Cross',
        description: 'A grid with a central blocked cross',
        gridSize: 5,
        blockedCells: [
            { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
            { row: 1, col: 2 }, { row: 3, col: 2 }
        ],
        difficulty: 4
    }
};

// Sample level sets
export const DEFAULT_LEVEL_SET: LevelSet = {
    id: 'default',
    name: 'Default Levels',
    description: 'The standard set of levels to learn and master the game',
    levelIds: ['level-1', 'level-2', 'level-3']
};

export const ADVANCED_LEVEL_SET: LevelSet = {
    id: 'advanced',
    name: 'Advanced Levels',
    description: 'Challenging levels for experienced players',
    levelIds: ['advanced-1']
};

export const LEVEL_SETS: LevelSet[] = [
    DEFAULT_LEVEL_SET,
    ADVANCED_LEVEL_SET
];

// Helper function to get a level by ID
export function getLevelById(levelId: string): Level | undefined {
    return LEVELS[levelId];
}

// Helper function to get levels for a level set
export function getLevelsForSet(levelSet: LevelSet): Level[] {
    return levelSet.levelIds.map(id => LEVELS[id]).filter(Boolean) as Level[];
}
