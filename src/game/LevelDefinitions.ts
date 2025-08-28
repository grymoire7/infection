import { LevelSet } from './GameStateManager';

// Sample level sets
export const DEFAULT_LEVEL_SET: LevelSet = {
    id: 'default',
    name: 'Default Levels',
    description: 'The standard set of levels to learn and master the game',
    order: 0,
    levels: [
        {
            id: 'level-1',
            name: 'Beginner\'s Grid',
            description: 'A simple 5x5 grid to get started',
            gridSize: 5,
            blockedCells: [],
            difficulty: 1,
            order: 0
        },
        {
            id: 'level-2',
            name: 'Edge Challenge',
            description: 'Focus on edge strategies',
            gridSize: 5,
            blockedCells: [],
            difficulty: 2,
            order: 1
        },
        {
            id: 'level-3',
            name: 'Corner Tactics',
            description: 'Master corner control',
            gridSize: 5,
            blockedCells: [],
            difficulty: 3,
            order: 2
        }
    ]
};

export const ADVANCED_LEVEL_SET: LevelSet = {
    id: 'advanced',
    name: 'Advanced Levels',
    description: 'Challenging levels for experienced players',
    order: 1,
    levels: [
        {
            id: 'advanced-1',
            name: 'The Cross',
            description: 'A grid with a central blocked cross',
            gridSize: 5,
            blockedCells: [
                { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
                { row: 1, col: 2 }, { row: 3, col: 2 }
            ],
            difficulty: 4,
            order: 0
        }
    ]
};

export const LEVEL_SETS: LevelSet[] = [
    DEFAULT_LEVEL_SET,
    ADVANCED_LEVEL_SET
];
