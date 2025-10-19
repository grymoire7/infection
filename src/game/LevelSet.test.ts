import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelSet } from './LevelSet';
import { Level } from './Level';
import { LevelSetDefinition } from './GameStateManager';

// Mock the LevelDefinitions module
vi.mock('./LevelDefinitions', () => ({
  LEVELS: {
    'level-1': {
      id: 'level-1',
      name: 'Level 1',
      description: 'First level',
      gridSize: 3,
      blockedCells: [],
    },
    'level-2': {
      id: 'level-2',
      name: 'Level 2',
      description: 'Second level',
      gridSize: 4,
      blockedCells: [{ row: 0, col: 0 }],
    },
    'level-3': {
      id: 'level-3',
      name: 'Level 3',
      description: 'Third level',
      gridSize: 5,
      blockedCells: [{ row: 1, col: 1 }],
    },
  },
}));

describe('LevelSet', () => {
  let basicSetDefinition: LevelSetDefinition;
  let singleLevelSetDefinition: LevelSetDefinition;
  let emptySetDefinition: LevelSetDefinition;
  let invalidSetDefinition: LevelSetDefinition;

  beforeEach(() => {
    basicSetDefinition = {
      id: 'basic-set',
      name: 'Basic Set',
      description: 'A basic level set',
      levelEntries: [
        { levelId: 'level-1', aiDifficulty: 'easy' },
        { levelId: 'level-2', aiDifficulty: 'medium' },
        { levelId: 'level-3', aiDifficulty: 'hard' },
      ],
    };

    singleLevelSetDefinition = {
      id: 'single-set',
      name: 'Single Set',
      description: 'A single level set',
      levelEntries: [{ levelId: 'level-1', aiDifficulty: 'easy' }],
    };

    emptySetDefinition = {
      id: 'empty-set',
      name: 'Empty Set',
      description: 'An empty level set',
      levelEntries: [],
    };

    invalidSetDefinition = {
      id: 'invalid-set',
      name: 'Invalid Set',
      description: 'A set with invalid level references',
      levelEntries: [
        { levelId: 'level-1', aiDifficulty: 'easy' },
        { levelId: 'non-existent', aiDifficulty: 'medium' },
        { levelId: 'level-3', aiDifficulty: 'hard' },
      ],
    };
  });

  describe('Constructor and Initialization', () => {
    it('should create a level set with basic definition', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.getId()).toBe('basic-set');
      expect(levelSet.getName()).toBe('Basic Set');
      expect(levelSet.getDescription()).toBe('A basic level set');
      expect(levelSet.getLength()).toBe(3);
    });

    it('should create levels from definition', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const allLevels = levelSet.getAllLevels();
      expect(allLevels).toHaveLength(3);
      expect(allLevels[0].getId()).toBe('level-1');
      expect(allLevels[1].getId()).toBe('level-2');
      expect(allLevels[2].getId()).toBe('level-3');
    });

    it('should set AI difficulty for each level', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const allLevels = levelSet.getAllLevels();
      expect(allLevels[0].getAIDifficulty()).toBe('easy');
      expect(allLevels[1].getAIDifficulty()).toBe('medium');
      expect(allLevels[2].getAIDifficulty()).toBe('hard');
    });

    it('should set correct indices for levels', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const allLevels = levelSet.getAllLevels();
      expect(allLevels[0].getIndex()).toBe(0);
      expect(allLevels[1].getIndex()).toBe(1);
      expect(allLevels[2].getIndex()).toBe(2);
    });

    it('should handle single level set', () => {
      const levelSet = new LevelSet(singleLevelSetDefinition);

      expect(levelSet.getLength()).toBe(1);
      expect(levelSet.first().getId()).toBe('level-1');
    });

    it('should handle empty level set', () => {
      const levelSet = new LevelSet(emptySetDefinition);

      expect(levelSet.isEmpty()).toBe(true);
      expect(levelSet.getLength()).toBe(0);
    });

    it('should skip invalid level IDs and warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const levelSet = new LevelSet(invalidSetDefinition);

      expect(levelSet.getLength()).toBe(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Level definition not found for ID: non-existent'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Linked List Structure', () => {
    it('should link levels in order', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const level1 = levelSet.getLevel(0);
      const level2 = levelSet.getLevel(1);
      const level3 = levelSet.getLevel(2);

      expect(level1?.next()).toBe(level2);
      expect(level2?.next()).toBe(level3);
      expect(level3?.next()).toBeNull();
    });

    it('should link levels bidirectionally', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const level1 = levelSet.getLevel(0);
      const level2 = levelSet.getLevel(1);
      const level3 = levelSet.getLevel(2);

      expect(level3?.previous()).toBe(level2);
      expect(level2?.previous()).toBe(level1);
      expect(level1?.previous()).toBeNull();
    });

    it('should set first level correctly', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const firstLevel = levelSet.first();
      expect(firstLevel.getId()).toBe('level-1');
      expect(firstLevel.isFirst()).toBe(true);
    });

    it('should set last level correctly', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const lastLevel = levelSet.last();
      expect(lastLevel?.getId()).toBe('level-3');
      expect(lastLevel?.isLast()).toBe(true);
    });

    it('should set current level to first level initially', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const currentLevel = levelSet.getCurrentLevel();
      expect(currentLevel.getId()).toBe('level-1');
    });

    it('should handle single level as both first and last', () => {
      const levelSet = new LevelSet(singleLevelSetDefinition);

      const firstLevel = levelSet.first();
      const lastLevel = levelSet.last();

      expect(firstLevel).toBe(lastLevel);
      expect(firstLevel.isFirst()).toBe(true);
      expect(firstLevel.isLast()).toBe(true);
    });
  });

  describe('Current Level Management', () => {
    it('should return current level', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const currentLevel = levelSet.getCurrentLevel();
      expect(currentLevel.getId()).toBe('level-1');
    });

    it('should return first level if current level is not set', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      // getCurrentLevel should return firstLevel even if currentLevel is somehow undefined
      const currentLevel = levelSet.getCurrentLevel();
      expect(currentLevel).toBe(levelSet.first());
    });

    it('should set current level by level object', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const level2 = levelSet.getLevel(1);
      const success = levelSet.setCurrentLevel(level2!);

      expect(success).toBe(true);
      expect(levelSet.getCurrentLevel().getId()).toBe('level-2');
    });

    it('should return false when setting non-existent level', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      // Create a mock level that doesn't exist in basicSetDefinition
      const mockLevelDef = {
        id: 'level-999',
        name: 'Non-existent Level',
        description: 'Does not exist',
        gridSize: 5,
        blockedCells: [],
      };
      const nonExistentLevel = new (class extends Level {
        constructor() {
          super(mockLevelDef, 'easy', 0);
        }
      })();

      const success = levelSet.setCurrentLevel(nonExistentLevel);

      expect(success).toBe(false);
    });

    it('should advance to next level', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.getCurrentLevel().getId()).toBe('level-1');

      const nextLevel = levelSet.nextLevel();
      expect(nextLevel?.getId()).toBe('level-2');
      expect(levelSet.getCurrentLevel().getId()).toBe('level-2');
    });

    it('should return null when advancing from last level', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      levelSet.nextLevel(); // Move to level-2
      levelSet.nextLevel(); // Move to level-3
      const nextLevel = levelSet.nextLevel(); // Try to move beyond last level

      expect(nextLevel).toBeNull();
      expect(levelSet.getCurrentLevel().getId()).toBe('level-3');
    });

    it('should handle advancing through all levels', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.getCurrentLevel().getId()).toBe('level-1');

      let nextLevel = levelSet.nextLevel();
      expect(nextLevel?.getId()).toBe('level-2');

      nextLevel = levelSet.nextLevel();
      expect(nextLevel?.getId()).toBe('level-3');

      nextLevel = levelSet.nextLevel();
      expect(nextLevel).toBeNull();
    });
  });

  describe('Level Access Methods', () => {
    it('should get level by index', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const level0 = levelSet.getLevel(0);
      const level1 = levelSet.getLevel(1);
      const level2 = levelSet.getLevel(2);

      expect(level0?.getId()).toBe('level-1');
      expect(level1?.getId()).toBe('level-2');
      expect(level2?.getId()).toBe('level-3');
    });

    it('should return null for negative index', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const level = levelSet.getLevel(-1);
      expect(level).toBeNull();
    });

    it('should return null for out-of-bounds index', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const level = levelSet.getLevel(10);
      expect(level).toBeNull();
    });

    it('should get level by ID', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const level = levelSet.getLevelById('level-2');
      expect(level?.getId()).toBe('level-2');
      expect(level?.getName()).toBe('Level 2');
    });

    it('should return null for non-existent level ID', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const level = levelSet.getLevelById('non-existent');
      expect(level).toBeNull();
    });

    it('should get level index', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const level1 = levelSet.getLevel(1);
      const index = levelSet.getLevelIndex(level1!);

      expect(index).toBe(1);
    });

    it('should return -1 for level not in set', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      // Create a mock level that doesn't exist in basicSetDefinition
      const mockLevelDef = {
        id: 'level-999',
        name: 'Non-existent Level',
        description: 'Does not exist',
        gridSize: 5,
        blockedCells: [],
      };
      const nonExistentLevel = new (class extends Level {
        constructor() {
          super(mockLevelDef, 'easy', 0);
        }
      })();

      const index = levelSet.getLevelIndex(nonExistentLevel);

      expect(index).toBe(-1);
    });

    it('should get all levels as array', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const allLevels = levelSet.getAllLevels();

      expect(allLevels).toHaveLength(3);
      expect(allLevels[0].getId()).toBe('level-1');
      expect(allLevels[1].getId()).toBe('level-2');
      expect(allLevels[2].getId()).toBe('level-3');
    });

    it('should return a copy of levels array', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      const allLevels1 = levelSet.getAllLevels();
      const allLevels2 = levelSet.getAllLevels();

      expect(allLevels1).not.toBe(allLevels2);
      expect(allLevels1).toEqual(allLevels2);
    });
  });

  describe('Level Set Properties', () => {
    it('should get definition', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.getDefinition()).toEqual(basicSetDefinition);
    });

    it('should get ID', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.getId()).toBe('basic-set');
    });

    it('should get name', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.getName()).toBe('Basic Set');
    });

    it('should get description', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.getDescription()).toBe('A basic level set');
    });

    it('should get length', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.getLength()).toBe(3);
    });

    it('should detect empty set', () => {
      const emptySet = new LevelSet(emptySetDefinition);
      const nonEmptySet = new LevelSet(basicSetDefinition);

      expect(emptySet.isEmpty()).toBe(true);
      expect(nonEmptySet.isEmpty()).toBe(false);
    });
  });

  describe('Level Existence Check', () => {
    it('should detect if level exists in set', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.hasLevel('level-1')).toBe(true);
      expect(levelSet.hasLevel('level-2')).toBe(true);
      expect(levelSet.hasLevel('level-3')).toBe(true);
    });

    it('should return false for non-existent level', () => {
      const levelSet = new LevelSet(basicSetDefinition);

      expect(levelSet.hasLevel('non-existent')).toBe(false);
      expect(levelSet.hasLevel('level-4')).toBe(false);
    });

    it('should return false for empty set', () => {
      const levelSet = new LevelSet(emptySetDefinition);

      expect(levelSet.hasLevel('level-1')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty level entries gracefully', () => {
      const levelSet = new LevelSet(emptySetDefinition);

      expect(levelSet.getLength()).toBe(0);
      expect(levelSet.isEmpty()).toBe(true);
      expect(levelSet.getAllLevels()).toEqual([]);
      expect(levelSet.getLevel(0)).toBeNull();
    });

    it('should handle single level navigation', () => {
      const levelSet = new LevelSet(singleLevelSetDefinition);

      const firstLevel = levelSet.first();
      expect(firstLevel.next()).toBeNull();
      expect(firstLevel.previous()).toBeNull();

      const nextLevel = levelSet.nextLevel();
      expect(nextLevel).toBeNull();
    });

    it('should maintain consistent state when level not found during setCurrentLevel', () => {
      const levelSet = new LevelSet(basicSetDefinition);
      const originalLevel = levelSet.getCurrentLevel();

      // Create a mock level that doesn't exist in basicSetDefinition
      const mockLevelDef = {
        id: 'level-999',
        name: 'Non-existent Level',
        description: 'Does not exist',
        gridSize: 5,
        blockedCells: [],
      };
      const nonExistentLevel = new (class extends Level {
        constructor() {
          super(mockLevelDef, 'easy', 0);
        }
      })();

      levelSet.setCurrentLevel(nonExistentLevel);

      // Current level should remain unchanged
      expect(levelSet.getCurrentLevel()).toBe(originalLevel);
    });
  });
});
