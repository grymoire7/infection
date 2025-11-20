import { LevelDefinition, LevelSetDefinition } from './GameStateManager';

// Define all levels separately
// The level key should exactly match the level's id.
// This id is of the form "level-s{gridSize}-b{blockedCellList}" where blockedCellList is a list of blocked cell coordinates. If the list is empty, use "x".
//   - example: "level-s5-b11" is a 5x5 grid with blocked cells {row:1,col:1}.
//   - example: "level-s7-b0246" is a 7x7 grid with blocked cells {row:0,col:2}, {row:4,col:6}.
//   - example: "level-s3-bx" is a 3x3 grid with no blocked cells.
// The description is currently unused.
// The name is displayed to the user and should be the name of a germ or disease. (e.g., "The common cold", "Influenza", "Ebola", etc.)
// Levels must be simply connected. Blocked cells should not create isolated sections.
export const LEVELS: Record<string, LevelDefinition> = {
    'level-s3-bx': {
        id: 'level-s3-bx',
        name: 'The common cold',
        description: 'unused',
        gridSize: 3,
        blockedCells: []
    },
    'level-s3-b11': {
        id: 'level-s3-b11',
        name: 'A spot of bother',
        description: 'unused',
        gridSize: 3,
        blockedCells: [ { row: 1, col: 1 } ]
    },
    'level-s4-bx': {
        id: 'level-s4-bx',
        name: 'Mild Flu',
        description: 'unused',
        gridSize: 4,
        blockedCells: []
    },
    'level-5s-bx': {
        id: 'level-5s-bx',
        name: 'Beginner\'s Grid',
        description: 'unused',
        gridSize: 5,
        blockedCells: []
    },
    'level-s9-bx': {
        id: 'level-s9-bx',
        name: '9x9 Grid',
        description: 'unused',
        gridSize: 9,
        blockedCells: []
    },
    'level-s19-bx': {
        id: 'level-s19-bx',
        name: 'Influenza Pandemic',
        description: 'unused',
        gridSize: 19,
        blockedCells: []
    },
    'level-s5-b02202442': {
        id: 'level-s5-b02202442',
        name: 'Edge Challenge',
        description: 'one blocked cell on each edge',
        gridSize: 5,
        blockedCells: [
            { row: 0, col: 2 },
            { row: 2, col: 0 }, { row: 2, col: 4 },
            { row: 4, col: 2 }
        ]
    },
    'level-s5-b11133133': {
        id: 'level-s5-b11133133',
        name: 'Corner Tactics',
        description: 'Master corner control',
        gridSize: 5,
        blockedCells: [
            { row: 1, col: 1 }, { row: 1, col: 3 },
            { row: 3, col: 1 }, { row: 3, col: 3 }
        ]
    },
    'level-s5-b2122231232': {
        id: 'level-s5-b2122231232',
        name: 'The Cross',
        description: 'A grid with a central blocked cross',
        gridSize: 5,
        blockedCells: [
            { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
            { row: 1, col: 2 }, { row: 3, col: 2 }
        ]
    },
    'level-s5-b011220243242': {
        id: 'level-s5-b011220243242',
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
// The id should be unique.
// The description is currently unused.
// The name is displayed to the user.
// Level entries link to levels by their id and specify the AI difficulty for that level.
// Level entries in a set should get progressively harder.
// Difficulty depends on both the level design (grid size, and blocked cells) and the AI difficulty.
// 
export const DEBUG_LEVEL_SET: LevelSetDefinition = {
    id: 'debug',
    name: 'Simple Debugging Levels',
    description: 'Development and testing levels',
    levelEntries: [
        { levelId: 'level-s3-bx', aiDifficulty: 'easy' },
        { levelId: 'level-s3-b11', aiDifficulty: 'easy' },
        { levelId: 'level-s4-bx', aiDifficulty: 'easy' }
    ]
};

export const BASIC_LEVEL_SET: LevelSetDefinition = {
    id: 'default',
    name: 'Basic germs',
    description: 'The standard set of levels to learn and master the game',
    levelEntries: [
        { levelId: 'level-s3-bx', aiDifficulty: 'easy' },
        { levelId: 'level-s3-b11', aiDifficulty: 'easy' },
        { levelId: 'level-s4-bx', aiDifficulty: 'easy' }
    ]
};

export const ADVANCED_LEVEL_SET: LevelSetDefinition = {
    id: 'advanced',
    name: 'Advanced Levels',
    description: 'Challenging levels for experienced players',
    levelEntries: [
        { levelId: 'level-s5-b11133133', aiDifficulty: 'hard' },
        { levelId: 'level-s5-b011220243242', aiDifficulty: 'expert' }
    ]
};

// TOOO: Add DEBUG_LEVEL_SET to LEVEL_SETS when NODE_ENV is development or test
export const LEVEL_SETS: LevelSetDefinition[] = [
    BASIC_LEVEL_SET,
    ADVANCED_LEVEL_SET
];

// Helper function to get a level by ID
export function getLevelById(levelId: string): LevelDefinition | undefined {
    return LEVELS[levelId];
}

// Helper function to get levels for a level set
export function getLevelsForSet(levelSet: LevelSetDefinition): LevelDefinition[] {
    return levelSet.levelEntries.map(entry => LEVELS[entry.levelId]).filter(Boolean) as LevelDefinition[];
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
