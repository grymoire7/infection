import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateManager, CellState, MoveHistoryEntry, SavedGameState } from './GameStateManager';
import { Level } from './Level';

// Mock Phaser's DataManager
class MockDataManager {
  private data: Map<string, any> = new Map();

  get(key: string): any {
    return this.data.get(key);
  }

  set(key: string, value: any): void {
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  reset(): void {
    this.data.clear();
  }
}

describe('GameStateManager', () => {
  let mockRegistry: MockDataManager;
  let stateManager: GameStateManager;
  let mockLevel: Level;

  // Helper to create a sample board state
  const createSampleBoardState = (size: number = 3): CellState[][] => {
    const board: CellState[][] = [];
    for (let row = 0; row < size; row++) {
      board[row] = [];
      for (let col = 0; col < size; col++) {
        board[row][col] = {
          dotCount: 0,
          owner: 'default',
          capacity: 4,
          isBlocked: false,
        };
      }
    }
    return board;
  };

  beforeEach(() => {
    mockRegistry = new MockDataManager();
    stateManager = new GameStateManager(mockRegistry as any);

    // Create a mock level
    const mockLevelDef = {
      id: 'test-level',
      name: 'Test Level',
      description: 'Test description',
      gridSize: 3,
      blockedCells: [],
    };
    mockLevel = new Level(mockLevelDef, 'easy', 0);
  });

  describe('Constructor', () => {
    it('should initialize with empty move history', () => {
      expect(stateManager.getMoveHistoryLength()).toBe(0);
    });

    it('should initialize with no saved state', () => {
      expect(stateManager.hasSavedState()).toBe(false);
    });
  });

  describe('saveMove', () => {
    it('should save a move to history', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'red');

      expect(stateManager.getMoveHistoryLength()).toBe(1);
    });

    it('should create a deep copy of board state', () => {
      const boardState = createSampleBoardState();
      boardState[0][0].dotCount = 5;

      stateManager.saveMove(boardState, 'red');

      // Modify original
      boardState[0][0].dotCount = 10;

      const undone = stateManager.undoLastMove();
      expect(undone?.boardState[0][0].dotCount).toBe(5);
    });

    it('should save multiple moves sequentially', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'red');
      stateManager.saveMove(boardState, 'blue');
      stateManager.saveMove(boardState, 'red');

      expect(stateManager.getMoveHistoryLength()).toBe(3);
    });

    it('should save current player with the move', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'blue');

      const undone = stateManager.undoLastMove();
      expect(undone?.currentPlayer).toBe('blue');
    });

    it('should limit history to MAX_MOVE_HISTORY (50)', () => {
      const boardState = createSampleBoardState();

      // Save 60 moves
      for (let i = 0; i < 60; i++) {
        stateManager.saveMove(boardState, i % 2 === 0 ? 'red' : 'blue');
      }

      expect(stateManager.getMoveHistoryLength()).toBe(50);
    });

    it('should remove oldest move when exceeding max history', () => {
      const boardState = createSampleBoardState();

      // Save first move with unique marker
      boardState[0][0].dotCount = 999;
      stateManager.saveMove(boardState, 'red');

      // Save 50 more moves
      boardState[0][0].dotCount = 1;
      for (let i = 0; i < 50; i++) {
        stateManager.saveMove(boardState, 'red');
      }

      // History should be 50, and the first move (999) should be gone
      expect(stateManager.getMoveHistoryLength()).toBe(50);

      // Undo all moves
      let lastMove: MoveHistoryEntry | null = null;
      for (let i = 0; i < 50; i++) {
        lastMove = stateManager.undoLastMove();
      }

      // The oldest remaining move should be 1, not 999
      expect(lastMove?.boardState[0][0].dotCount).toBe(1);
    });
  });

  describe('undoLastMove', () => {
    it('should return null when no moves to undo', () => {
      const result = stateManager.undoLastMove();

      expect(result).toBeNull();
    });

    it('should return last saved move', () => {
      const boardState = createSampleBoardState();
      boardState[1][1].dotCount = 3;
      boardState[1][1].owner = 'red';

      stateManager.saveMove(boardState, 'red');

      const undone = stateManager.undoLastMove();

      expect(undone?.boardState[1][1].dotCount).toBe(3);
      expect(undone?.boardState[1][1].owner).toBe('red');
      expect(undone?.currentPlayer).toBe('red');
    });

    it('should remove move from history', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'red');
      expect(stateManager.getMoveHistoryLength()).toBe(1);

      stateManager.undoLastMove();
      expect(stateManager.getMoveHistoryLength()).toBe(0);
    });

    it('should return deep copy to prevent mutation', () => {
      const boardState = createSampleBoardState();
      boardState[0][0].dotCount = 5;

      stateManager.saveMove(boardState, 'red');

      const undone = stateManager.undoLastMove();
      undone!.boardState[0][0].dotCount = 99;

      // Save again and undo - should get original value
      stateManager.saveMove(boardState, 'red');
      const undone2 = stateManager.undoLastMove();

      expect(undone2?.boardState[0][0].dotCount).toBe(5);
    });

    it('should undo moves in LIFO order', () => {
      const boardState = createSampleBoardState();

      boardState[0][0].dotCount = 1;
      stateManager.saveMove(boardState, 'red');

      boardState[0][0].dotCount = 2;
      stateManager.saveMove(boardState, 'blue');

      boardState[0][0].dotCount = 3;
      stateManager.saveMove(boardState, 'red');

      const undone1 = stateManager.undoLastMove();
      expect(undone1?.boardState[0][0].dotCount).toBe(3);
      expect(undone1?.currentPlayer).toBe('red');

      const undone2 = stateManager.undoLastMove();
      expect(undone2?.boardState[0][0].dotCount).toBe(2);
      expect(undone2?.currentPlayer).toBe('blue');

      const undone3 = stateManager.undoLastMove();
      expect(undone3?.boardState[0][0].dotCount).toBe(1);
      expect(undone3?.currentPlayer).toBe('red');
    });

    it('should log message when no moves to undo', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      stateManager.undoLastMove();

      expect(consoleSpy).toHaveBeenCalledWith('No moves to undo');

      consoleSpy.mockRestore();
    });
  });

  describe('canUndo', () => {
    it('should return false when no moves saved', () => {
      expect(stateManager.canUndo()).toBe(false);
    });

    it('should return true when moves are available', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'red');

      expect(stateManager.canUndo()).toBe(true);
    });

    it('should return false after undoing all moves', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'red');
      stateManager.undoLastMove();

      expect(stateManager.canUndo()).toBe(false);
    });
  });

  describe('saveToRegistry', () => {
    it('should save complete game state to registry', () => {
      const boardState = createSampleBoardState();

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      expect(mockRegistry.get('gameState')).toBeDefined();
    });

    it('should create deep copy of board state', () => {
      const boardState = createSampleBoardState();
      boardState[0][0].dotCount = 5;

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      // Modify original
      boardState[0][0].dotCount = 10;

      const loaded = stateManager.loadFromRegistry();
      expect(loaded?.boardState[0][0].dotCount).toBe(5);
    });

    it('should save all parameters correctly', () => {
      const boardState = createSampleBoardState();
      const levelWinners: ('red' | 'blue')[] = ['red', 'blue'];

      stateManager.saveToRegistry(
        boardState,
        'blue',
        'red',
        'blue',
        true,
        true,
        mockLevel,
        levelWinners,
        'Human Player Wins!'
      );

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.currentPlayer).toBe('blue');
      expect(loaded?.humanPlayer).toBe('red');
      expect(loaded?.computerPlayerColor).toBe('blue');
      expect(loaded?.gameOver).toBe(true);
      expect(loaded?.levelOver).toBe(true);
      expect(loaded?.currentLevel).toBe(mockLevel);
      expect(loaded?.levelWinners).toEqual(['red', 'blue']);
      expect(loaded?.winner).toBe('Human Player Wins!');
    });

    it('should save current move history', () => {
      const boardState = createSampleBoardState();

      // Add some moves to history
      stateManager.saveMove(boardState, 'red');
      stateManager.saveMove(boardState, 'blue');

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      const loaded = stateManager.loadFromRegistry();
      expect(loaded?.moveHistory.length).toBe(2);
    });

    it('should use default values for optional parameters', () => {
      const boardState = createSampleBoardState();

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        undefined as any,
        undefined as any,
        mockLevel
      );

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.gameOver).toBe(false);
      expect(loaded?.levelOver).toBe(false);
      expect(loaded?.levelWinners).toEqual([]);
      expect(loaded?.winner).toBeNull();
    });
  });

  describe('loadFromRegistry', () => {
    it('should return null when no saved state exists', () => {
      const loaded = stateManager.loadFromRegistry();

      expect(loaded).toBeNull();
    });

    it('should restore saved game state', () => {
      const boardState = createSampleBoardState();
      boardState[1][1].dotCount = 7;

      stateManager.saveToRegistry(
        boardState,
        'blue',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        ['red'],
        null
      );

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.boardState[1][1].dotCount).toBe(7);
      expect(loaded?.currentPlayer).toBe('blue');
      expect(loaded?.humanPlayer).toBe('red');
      expect(loaded?.levelWinners).toEqual(['red']);
    });

    it('should restore move history', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'red');
      stateManager.saveMove(boardState, 'blue');

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      // Create new state manager to test history restoration
      const newStateManager = new GameStateManager(mockRegistry as any);
      const loaded = newStateManager.loadFromRegistry();

      expect(loaded?.moveHistory.length).toBe(2);
      expect(newStateManager.getMoveHistoryLength()).toBe(2);
    });

    it('should return deep copy to prevent mutation', () => {
      const boardState = createSampleBoardState();
      boardState[0][0].dotCount = 5;

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      const loaded = stateManager.loadFromRegistry();
      loaded!.boardState[0][0].dotCount = 99;

      const loaded2 = stateManager.loadFromRegistry();
      expect(loaded2?.boardState[0][0].dotCount).toBe(5);
    });
  });

  describe('clearSavedState', () => {
    it('should remove saved state from registry', () => {
      const boardState = createSampleBoardState();

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      expect(stateManager.hasSavedState()).toBe(true);

      stateManager.clearSavedState();

      expect(stateManager.hasSavedState()).toBe(false);
    });

    it('should clear move history', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'red');
      stateManager.saveMove(boardState, 'blue');

      expect(stateManager.getMoveHistoryLength()).toBe(2);

      stateManager.clearSavedState();

      expect(stateManager.getMoveHistoryLength()).toBe(0);
    });

    it('should not throw when clearing non-existent state', () => {
      expect(() => {
        stateManager.clearSavedState();
      }).not.toThrow();
    });
  });

  describe('hasSavedState', () => {
    it('should return false initially', () => {
      expect(stateManager.hasSavedState()).toBe(false);
    });

    it('should return true after saving state', () => {
      const boardState = createSampleBoardState();

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      expect(stateManager.hasSavedState()).toBe(true);
    });

    it('should return false after clearing state', () => {
      const boardState = createSampleBoardState();

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      stateManager.clearSavedState();

      expect(stateManager.hasSavedState()).toBe(false);
    });
  });

  describe('getMoveHistoryLength', () => {
    it('should return 0 initially', () => {
      expect(stateManager.getMoveHistoryLength()).toBe(0);
    });

    it('should return correct count after saving moves', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'red');
      stateManager.saveMove(boardState, 'blue');
      stateManager.saveMove(boardState, 'red');

      expect(stateManager.getMoveHistoryLength()).toBe(3);
    });

    it('should decrease after undoing', () => {
      const boardState = createSampleBoardState();

      stateManager.saveMove(boardState, 'red');
      stateManager.saveMove(boardState, 'blue');

      stateManager.undoLastMove();

      expect(stateManager.getMoveHistoryLength()).toBe(1);
    });
  });

  describe('initializeNewGameState', () => {
    it('should create new game state with human as red', () => {
      stateManager.initializeNewGameState('red', mockLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.humanPlayer).toBe('red');
      expect(loaded?.computerPlayerColor).toBe('blue');
      expect(loaded?.currentPlayer).toBe('red');
    });

    it('should create new game state with human as blue', () => {
      stateManager.initializeNewGameState('blue', mockLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.humanPlayer).toBe('blue');
      expect(loaded?.computerPlayerColor).toBe('red');
      expect(loaded?.currentPlayer).toBe('blue');
    });

    it('should initialize with empty board state', () => {
      stateManager.initializeNewGameState('red', mockLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.boardState).toEqual([]);
    });

    it('should initialize with game not over', () => {
      stateManager.initializeNewGameState('red', mockLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.gameOver).toBe(false);
      expect(loaded?.levelOver).toBe(false);
    });

    it('should clear move history', () => {
      const boardState = createSampleBoardState();
      stateManager.saveMove(boardState, 'red');

      stateManager.initializeNewGameState('red', mockLevel);

      expect(stateManager.getMoveHistoryLength()).toBe(0);
    });

    it('should set current level', () => {
      stateManager.initializeNewGameState('red', mockLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.currentLevel).toBe(mockLevel);
    });
  });

  describe('updateLevelCompletion', () => {
    it('should mark level as over', () => {
      stateManager.initializeNewGameState('red', mockLevel);

      stateManager.updateLevelCompletion('red', mockLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.levelOver).toBe(true);
    });

    it('should record winner at correct index', () => {
      stateManager.initializeNewGameState('red', mockLevel);

      stateManager.updateLevelCompletion('blue', mockLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.levelWinners[0]).toBe('blue');
    });

    it('should preserve existing level winners', () => {
      const level0 = new Level({ id: 'l0', name: 'L0', description: '', gridSize: 3, blockedCells: [] }, 'easy', 0);
      const level1 = new Level({ id: 'l1', name: 'L1', description: '', gridSize: 3, blockedCells: [] }, 'easy', 1);

      stateManager.initializeNewGameState('red', level0);

      // Complete level 0
      stateManager.updateLevelCompletion('red', level0);

      // Move to level 1 (simulate by updating state)
      const state = stateManager.loadFromRegistry();
      stateManager.saveToRegistry(
        state!.boardState,
        state!.currentPlayer,
        state!.humanPlayer,
        state!.computerPlayerColor,
        false,
        false,
        level1,
        state!.levelWinners,
        null
      );

      // Complete level 1
      stateManager.updateLevelCompletion('blue', level1);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.levelWinners[0]).toBe('red');
      expect(loaded?.levelWinners[1]).toBe('blue');
    });

    it('should do nothing if no saved state exists', () => {
      expect(() => {
        stateManager.updateLevelCompletion('red', mockLevel);
      }).not.toThrow();

      expect(stateManager.hasSavedState()).toBe(false);
    });
  });

  describe('advanceToNextLevel', () => {
    it('should set new level as current level', () => {
      const nextLevel = new Level(
        { id: 'next', name: 'Next Level', description: '', gridSize: 5, blockedCells: [] },
        'medium',
        1
      );

      stateManager.initializeNewGameState('red', mockLevel);

      stateManager.advanceToNextLevel(nextLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.currentLevel).toBe(nextLevel);
    });

    it('should clear board state for new level', () => {
      const boardState = createSampleBoardState();
      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      const nextLevel = new Level(
        { id: 'next', name: 'Next', description: '', gridSize: 5, blockedCells: [] },
        'medium',
        1
      );

      stateManager.advanceToNextLevel(nextLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.boardState).toEqual([]);
    });

    it('should clear move history', () => {
      const boardState = createSampleBoardState();
      stateManager.saveMove(boardState, 'red');
      stateManager.saveMove(boardState, 'blue');

      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      const nextLevel = new Level(
        { id: 'next', name: 'Next', description: '', gridSize: 5, blockedCells: [] },
        'medium',
        1
      );

      stateManager.advanceToNextLevel(nextLevel);

      expect(stateManager.getMoveHistoryLength()).toBe(0);
    });

    it('should reset to human player turn', () => {
      const boardState = createSampleBoardState();
      stateManager.saveToRegistry(
        boardState,
        'blue', // Computer's turn
        'red', // Human is red
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      const nextLevel = new Level(
        { id: 'next', name: 'Next', description: '', gridSize: 5, blockedCells: [] },
        'medium',
        1
      );

      stateManager.advanceToNextLevel(nextLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.currentPlayer).toBe('red');
    });

    it('should reset gameOver and levelOver flags', () => {
      const boardState = createSampleBoardState();
      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        true, // gameOver
        true, // levelOver
        mockLevel,
        ['red'],
        'Human Wins'
      );

      const nextLevel = new Level(
        { id: 'next', name: 'Next', description: '', gridSize: 5, blockedCells: [] },
        'medium',
        1
      );

      stateManager.advanceToNextLevel(nextLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.gameOver).toBe(false);
      expect(loaded?.levelOver).toBe(false);
      expect(loaded?.winner).toBeNull();
    });

    it('should preserve level winners', () => {
      const boardState = createSampleBoardState();
      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        true,
        mockLevel,
        ['red', 'blue'],
        null
      );

      const nextLevel = new Level(
        { id: 'next', name: 'Next', description: '', gridSize: 5, blockedCells: [] },
        'medium',
        1
      );

      stateManager.advanceToNextLevel(nextLevel);

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.levelWinners).toEqual(['red', 'blue']);
    });
  });

  describe('markGameComplete', () => {
    it('should set gameOver flag to true', () => {
      stateManager.initializeNewGameState('red', mockLevel);

      stateManager.markGameComplete('Human Player Wins!');

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.gameOver).toBe(true);
    });

    it('should set winner message', () => {
      stateManager.initializeNewGameState('red', mockLevel);

      stateManager.markGameComplete('Computer Wins!');

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.winner).toBe('Computer Wins!');
    });

    it('should preserve all other state', () => {
      const boardState = createSampleBoardState();
      boardState[1][1].dotCount = 5;

      stateManager.saveToRegistry(
        boardState,
        'blue',
        'red',
        'blue',
        false,
        true,
        mockLevel,
        ['red'],
        null
      );

      stateManager.markGameComplete('Test Winner');

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.boardState[1][1].dotCount).toBe(5);
      expect(loaded?.currentPlayer).toBe('blue');
      expect(loaded?.humanPlayer).toBe('red');
      expect(loaded?.levelOver).toBe(true);
      expect(loaded?.levelWinners).toEqual(['red']);
    });

    it('should do nothing if no saved state exists', () => {
      expect(() => {
        stateManager.markGameComplete('Winner');
      }).not.toThrow();

      expect(stateManager.hasSavedState()).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete game flow', () => {
      // Initialize game
      stateManager.initializeNewGameState('red', mockLevel);

      // Make some moves
      const boardState = createSampleBoardState();
      boardState[0][0].dotCount = 1;
      stateManager.saveMove(boardState, 'red');

      boardState[1][1].dotCount = 2;
      stateManager.saveMove(boardState, 'blue');

      // Save state
      stateManager.saveToRegistry(
        boardState,
        'red',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        [],
        null
      );

      // Complete level
      stateManager.updateLevelCompletion('red', mockLevel);

      // Mark game complete
      stateManager.markGameComplete('Human Wins!');

      const loaded = stateManager.loadFromRegistry();

      expect(loaded?.gameOver).toBe(true);
      expect(loaded?.levelOver).toBe(true);
      expect(loaded?.winner).toBe('Human Wins!');
      expect(loaded?.levelWinners[0]).toBe('red');
      expect(loaded?.moveHistory.length).toBe(2);
    });

    it('should persist state across manager instances', () => {
      const boardState = createSampleBoardState();
      boardState[2][2].dotCount = 9;

      stateManager.saveToRegistry(
        boardState,
        'blue',
        'red',
        'blue',
        false,
        false,
        mockLevel,
        ['red'],
        null
      );

      // Create new manager with same registry
      const newManager = new GameStateManager(mockRegistry as any);
      const loaded = newManager.loadFromRegistry();

      expect(loaded?.boardState[2][2].dotCount).toBe(9);
      expect(loaded?.currentPlayer).toBe('blue');
      expect(loaded?.levelWinners).toEqual(['red']);
    });
  });
});
