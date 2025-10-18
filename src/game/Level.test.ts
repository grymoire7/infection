import { describe, it, expect, beforeEach } from 'vitest';
import { Level } from './Level';
import { LevelDefinition } from './GameStateManager';

describe('Level', () => {
  let basicLevelDef: LevelDefinition;
  let advancedLevelDef: LevelDefinition;

  beforeEach(() => {
    basicLevelDef = {
      id: 'test-level-1',
      name: 'Test Level',
      description: 'A test level',
      gridSize: 5,
      blockedCells: [],
    };

    advancedLevelDef = {
      id: 'test-level-2',
      name: 'Advanced Test Level',
      description: 'An advanced test level',
      gridSize: 7,
      blockedCells: [
        { row: 0, col: 0 },
        { row: 3, col: 3 },
      ],
    };
  });

  describe('Constructor', () => {
    it('should create a level with basic parameters', () => {
      const level = new Level(basicLevelDef);

      expect(level.getId()).toBe('test-level-1');
      expect(level.getName()).toBe('Test Level');
      expect(level.getDescription()).toBe('A test level');
      expect(level.getGridSize()).toBe(5);
      expect(level.getBlockedCells()).toEqual([]);
    });

    it('should default to easy difficulty when not specified', () => {
      const level = new Level(basicLevelDef);

      expect(level.getAIDifficulty()).toBe('easy');
    });

    it('should accept custom AI difficulty', () => {
      const level = new Level(basicLevelDef, 'hard');

      expect(level.getAIDifficulty()).toBe('hard');
    });

    it('should accept custom index', () => {
      const level = new Level(basicLevelDef, 'easy', 5);

      expect(level.getIndex()).toBe(5);
    });

    it('should default to index 0 when not specified', () => {
      const level = new Level(basicLevelDef);

      expect(level.getIndex()).toBe(0);
    });

    it('should handle levels with blocked cells', () => {
      const level = new Level(advancedLevelDef);

      expect(level.getBlockedCells()).toEqual([
        { row: 0, col: 0 },
        { row: 3, col: 3 },
      ]);
    });
  });

  describe('Getters', () => {
    it('should return the correct definition', () => {
      const level = new Level(basicLevelDef);

      expect(level.getDefinition()).toEqual(basicLevelDef);
    });

    it('should return the correct ID', () => {
      const level = new Level(advancedLevelDef);

      expect(level.getId()).toBe('test-level-2');
    });

    it('should return the correct name', () => {
      const level = new Level(advancedLevelDef);

      expect(level.getName()).toBe('Advanced Test Level');
    });

    it('should return the correct description', () => {
      const level = new Level(advancedLevelDef);

      expect(level.getDescription()).toBe('An advanced test level');
    });

    it('should return the correct grid size', () => {
      const level = new Level(advancedLevelDef);

      expect(level.getGridSize()).toBe(7);
    });

    it('should return the correct blocked cells', () => {
      const level = new Level(advancedLevelDef);

      expect(level.getBlockedCells()).toHaveLength(2);
    });

    it('should return the correct AI difficulty', () => {
      const level = new Level(basicLevelDef, 'expert', 3);

      expect(level.getAIDifficulty()).toBe('expert');
    });

    it('should return the correct index', () => {
      const level = new Level(basicLevelDef, 'medium', 7);

      expect(level.getIndex()).toBe(7);
    });
  });

  describe('AI Difficulty', () => {
    it('should allow setting AI difficulty', () => {
      const level = new Level(basicLevelDef, 'easy');

      level.setAIDifficulty('hard');

      expect(level.getAIDifficulty()).toBe('hard');
    });

    it('should handle all difficulty levels', () => {
      const level = new Level(basicLevelDef);

      level.setAIDifficulty('easy');
      expect(level.getAIDifficulty()).toBe('easy');

      level.setAIDifficulty('medium');
      expect(level.getAIDifficulty()).toBe('medium');

      level.setAIDifficulty('hard');
      expect(level.getAIDifficulty()).toBe('hard');

      level.setAIDifficulty('expert');
      expect(level.getAIDifficulty()).toBe('expert');
    });
  });

  describe('Linked List - Next/Previous', () => {
    it('should initially have no next or previous level', () => {
      const level = new Level(basicLevelDef);

      expect(level.next()).toBeNull();
      expect(level.previous()).toBeNull();
    });

    it('should allow setting next level', () => {
      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);

      level1.setNext(level2);

      expect(level1.next()).toBe(level2);
    });

    it('should allow setting previous level', () => {
      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);

      level2.setPrevious(level1);

      expect(level2.previous()).toBe(level1);
    });

    it('should allow setting null for next level', () => {
      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);

      level1.setNext(level2);
      level1.setNext(null);

      expect(level1.next()).toBeNull();
    });

    it('should allow setting null for previous level', () => {
      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);

      level2.setPrevious(level1);
      level2.setPrevious(null);

      expect(level2.previous()).toBeNull();
    });

    it('should create a bidirectional link between two levels', () => {
      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);

      level1.setNext(level2);
      level2.setPrevious(level1);

      expect(level1.next()).toBe(level2);
      expect(level2.previous()).toBe(level1);
    });
  });

  describe('First/Last Detection', () => {
    it('should identify a standalone level as both first and last', () => {
      const level = new Level(basicLevelDef);

      expect(level.isFirst()).toBe(true);
      expect(level.isLast()).toBe(true);
    });

    it('should identify the first level in a chain', () => {
      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);

      level1.setNext(level2);
      level2.setPrevious(level1);

      expect(level1.isFirst()).toBe(true);
      expect(level1.isLast()).toBe(false);
    });

    it('should identify the last level in a chain', () => {
      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);

      level1.setNext(level2);
      level2.setPrevious(level1);

      expect(level2.isFirst()).toBe(false);
      expect(level2.isLast()).toBe(true);
    });

    it('should identify a middle level in a chain', () => {
      const levelDef3: LevelDefinition = {
        id: 'test-level-3',
        name: 'Third Level',
        description: 'A third test level',
        gridSize: 9,
        blockedCells: [],
      };

      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);
      const level3 = new Level(levelDef3, 'hard', 2);

      level1.setNext(level2);
      level2.setPrevious(level1);
      level2.setNext(level3);
      level3.setPrevious(level2);

      expect(level2.isFirst()).toBe(false);
      expect(level2.isLast()).toBe(false);
    });
  });

  describe('Linked List Navigation', () => {
    it('should navigate forward through a chain of levels', () => {
      const levelDef3: LevelDefinition = {
        id: 'test-level-3',
        name: 'Third Level',
        description: 'A third test level',
        gridSize: 9,
        blockedCells: [],
      };

      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);
      const level3 = new Level(levelDef3, 'hard', 2);

      level1.setNext(level2);
      level2.setPrevious(level1);
      level2.setNext(level3);
      level3.setPrevious(level2);

      expect(level1.next()).toBe(level2);
      expect(level1.next()?.next()).toBe(level3);
      expect(level1.next()?.next()?.next()).toBeNull();
    });

    it('should navigate backward through a chain of levels', () => {
      const levelDef3: LevelDefinition = {
        id: 'test-level-3',
        name: 'Third Level',
        description: 'A third test level',
        gridSize: 9,
        blockedCells: [],
      };

      const level1 = new Level(basicLevelDef, 'easy', 0);
      const level2 = new Level(advancedLevelDef, 'medium', 1);
      const level3 = new Level(levelDef3, 'hard', 2);

      level1.setNext(level2);
      level2.setPrevious(level1);
      level2.setNext(level3);
      level3.setPrevious(level2);

      expect(level3.previous()).toBe(level2);
      expect(level3.previous()?.previous()).toBe(level1);
      expect(level3.previous()?.previous()?.previous()).toBeNull();
    });
  });
});
