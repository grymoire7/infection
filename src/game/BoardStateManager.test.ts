import { describe, it, expect, beforeEach } from 'vitest';
import { BoardStateManager } from './BoardStateManager';
import type { CellState } from './GameStateManager';

describe('BoardStateManager', () => {
  let boardStateManager: BoardStateManager;

  beforeEach(() => {
    boardStateManager = new BoardStateManager(3);
  });

  describe('Constructor', () => {
    it('should initialize with empty board state when gridSize is 0', () => {
      const manager = new BoardStateManager(0);
      const state = manager.getState();
      expect(state.length).toBe(0);
    });

    it('should initialize board with specified grid size', () => {
      const manager = new BoardStateManager(3);
      const state = manager.getState();
      expect(state.length).toBe(3);
      expect(state[0].length).toBe(3);
    });
  });

  describe('Board Initialization', () => {
    it('should initialize a 3x3 board with no blocked cells', () => {
      const manager = new BoardStateManager(3, []);
      const state = manager.getState();

      expect(state.length).toBe(3);
      expect(state[0].length).toBe(3);

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cell = state[row][col];
          expect(cell.owner).toBe('default');
          expect(cell.dotCount).toBe(0);
          expect(cell.capacity).toBe(0); // Capacity set to 0 initially
          expect(cell.isBlocked).toBe(false);
        }
      }
    });

    it('should initialize a 5x5 board with blocked cells', () => {
      const blockedCells = [
        { row: 0, col: 0 },
        { row: 2, col: 2 },
        { row: 4, col: 4 },
      ];
      const manager = new BoardStateManager(5, blockedCells);
      const state = manager.getState();

      expect(state[0][0].isBlocked).toBe(true);
      expect(state[0][0].owner).toBe('blocked');
      expect(state[2][2].isBlocked).toBe(true);
      expect(state[2][2].owner).toBe('blocked');
      expect(state[4][4].isBlocked).toBe(true);
      expect(state[4][4].owner).toBe('blocked');

      // Non-blocked cells should not be blocked
      expect(state[1][1].isBlocked).toBe(false);
      expect(state[1][1].owner).toBe('default');
    });

    it('should create correct number of cells', () => {
      const manager = new BoardStateManager(4);
      const state = manager.getState();

      let cellCount = 0;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if (state[row][col]) cellCount++;
        }
      }

      expect(cellCount).toBe(16);
    });
  });

  describe('setCellCapacity', () => {
    beforeEach(() => {
      boardStateManager = new BoardStateManager(3, []);
    });

    it('should update cell capacity', () => {
      boardStateManager.setCellCapacity(1, 1, 10);
      const cell = boardStateManager.getCellState(1, 1);

      expect(cell.capacity).toBe(10);
    });

    it('should update capacity for multiple cells', () => {
      boardStateManager.setCellCapacity(0, 0, 5);
      boardStateManager.setCellCapacity(2, 2, 7);

      expect(boardStateManager.getCellState(0, 0).capacity).toBe(5);
      expect(boardStateManager.getCellState(2, 2).capacity).toBe(7);
    });
  });

  describe('isValidMove', () => {
    beforeEach(() => {
      boardStateManager = new BoardStateManager(3, []);
    });

    it('should allow move on empty cell', () => {
      expect(boardStateManager.isValidMove(0, 0, 'red')).toBe(true);
    });

    it('should allow move on own cell', () => {
      boardStateManager.placeDot(0, 0, 'red');
      expect(boardStateManager.isValidMove(0, 0, 'red')).toBe(true);
    });

    it('should not allow move on opponent cell', () => {
      boardStateManager.placeDot(0, 0, 'red');
      expect(boardStateManager.isValidMove(0, 0, 'blue')).toBe(false);
    });

    it('should not allow move on blocked cell', () => {
      const blockedCells = [{ row: 1, col: 1 }];
      const manager = new BoardStateManager(3, blockedCells);
      expect(manager.isValidMove(1, 1, 'red')).toBe(false);
    });

    it('should not allow move out of bounds (negative row)', () => {
      expect(boardStateManager.isValidMove(-1, 0, 'red')).toBe(false);
    });

    it('should not allow move out of bounds (negative col)', () => {
      expect(boardStateManager.isValidMove(0, -1, 'red')).toBe(false);
    });

    it('should not allow move out of bounds (row too large)', () => {
      expect(boardStateManager.isValidMove(3, 0, 'red')).toBe(false);
    });

    it('should not allow move out of bounds (col too large)', () => {
      expect(boardStateManager.isValidMove(0, 3, 'red')).toBe(false);
    });
  });

  describe('placeDot', () => {
    beforeEach(() => {
      boardStateManager = new BoardStateManager(3, []);
    });

    it('should place dot on empty cell', () => {
      boardStateManager.placeDot(0, 0, 'red');
      const cell = boardStateManager.getCellState(0, 0);

      expect(cell.owner).toBe('red');
      expect(cell.dotCount).toBe(1);
    });

    it('should increment dot count on own cell', () => {
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(0, 0, 'red');
      const cell = boardStateManager.getCellState(0, 0);

      expect(cell.owner).toBe('red');
      expect(cell.dotCount).toBe(2);
    });

    it('should not change owner when adding to own cell', () => {
      boardStateManager.placeDot(1, 1, 'blue');
      boardStateManager.placeDot(1, 1, 'blue');
      const cell = boardStateManager.getCellState(1, 1);

      expect(cell.owner).toBe('blue');
      expect(cell.dotCount).toBe(2);
    });
  });

  describe('shouldExplode', () => {
    beforeEach(() => {
      boardStateManager = new BoardStateManager(3, []);
      // Set capacities manually since they're not calculated automatically
      boardStateManager.setCellCapacity(0, 0, 2);
    });

    it('should return true when dotCount exceeds capacity', () => {
      boardStateManager.placeDot(0, 0, 'red'); // capacity 2
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(0, 0, 'red'); // dotCount = 3 > capacity 2

      expect(boardStateManager.shouldExplode(0, 0)).toBe(true);
    });

    it('should return false when dotCount equals capacity', () => {
      boardStateManager.placeDot(0, 0, 'red'); // capacity 2
      boardStateManager.placeDot(0, 0, 'red'); // dotCount = 2

      expect(boardStateManager.shouldExplode(0, 0)).toBe(false);
    });

    it('should return false when dotCount is less than capacity', () => {
      boardStateManager.placeDot(0, 0, 'red'); // capacity 2, dotCount = 1

      expect(boardStateManager.shouldExplode(0, 0)).toBe(false);
    });
  });

  describe('explodeCell', () => {
    beforeEach(() => {
      boardStateManager = new BoardStateManager(5, []);
      // Set capacity for interior cell
      boardStateManager.setCellCapacity(2, 2, 4);
    });

    it('should distribute dots to adjacent cells', () => {
      // Interior cell at (2,2) with capacity 4
      boardStateManager.placeDot(2, 2, 'red');
      boardStateManager.placeDot(2, 2, 'red');
      boardStateManager.placeDot(2, 2, 'red');
      boardStateManager.placeDot(2, 2, 'red');
      boardStateManager.placeDot(2, 2, 'red'); // dotCount = 5 > capacity 4

      boardStateManager.explodeCell(2, 2);

      // Cell should have 1 dot remaining (5 - 4 = 1) and stay red
      const cell = boardStateManager.getCellState(2, 2);
      expect(cell.dotCount).toBe(1);
      expect(cell.owner).toBe('red');

      // Adjacent cells should receive dots
      const topCell = boardStateManager.getCellState(1, 2);
      const bottomCell = boardStateManager.getCellState(3, 2);
      const leftCell = boardStateManager.getCellState(2, 1);
      const rightCell = boardStateManager.getCellState(2, 3);

      expect(topCell.dotCount).toBe(1);
      expect(topCell.owner).toBe('red');
      expect(bottomCell.dotCount).toBe(1);
      expect(bottomCell.owner).toBe('red');
      expect(leftCell.dotCount).toBe(1);
      expect(leftCell.owner).toBe('red');
      expect(rightCell.dotCount).toBe(1);
      expect(rightCell.owner).toBe('red');
    });

    it('should convert opponent cells when distributing dots', () => {
      // Set up opponent cells around (2,2)
      boardStateManager.placeDot(1, 2, 'blue');
      boardStateManager.placeDot(3, 2, 'blue');
      boardStateManager.placeDot(2, 1, 'blue');
      boardStateManager.placeDot(2, 3, 'blue');

      // Explode red cell at (2,2)
      boardStateManager.placeDot(2, 2, 'red');
      boardStateManager.placeDot(2, 2, 'red');
      boardStateManager.placeDot(2, 2, 'red');
      boardStateManager.placeDot(2, 2, 'red');
      boardStateManager.placeDot(2, 2, 'red');

      boardStateManager.explodeCell(2, 2);

      // All adjacent cells should now be red
      expect(boardStateManager.getCellState(1, 2).owner).toBe('red');
      expect(boardStateManager.getCellState(3, 2).owner).toBe('red');
      expect(boardStateManager.getCellState(2, 1).owner).toBe('red');
      expect(boardStateManager.getCellState(2, 3).owner).toBe('red');

      // Dot counts should be incremented
      expect(boardStateManager.getCellState(1, 2).dotCount).toBe(2);
      expect(boardStateManager.getCellState(3, 2).dotCount).toBe(2);
      expect(boardStateManager.getCellState(2, 1).dotCount).toBe(2);
      expect(boardStateManager.getCellState(2, 3).dotCount).toBe(2);
    });

    it('should not distribute dots to blocked cells', () => {
      const blockedCells = [{ row: 1, col: 2 }];
      const manager = new BoardStateManager(5, blockedCells);
      manager.setCellCapacity(2, 2, 3); // 3 because one adjacent cell is blocked

      // Explode cell at (2,2)
      manager.placeDot(2, 2, 'red');
      manager.placeDot(2, 2, 'red');
      manager.placeDot(2, 2, 'red');
      manager.placeDot(2, 2, 'red');

      manager.explodeCell(2, 2);

      // Blocked cell should remain unchanged
      const blockedCell = manager.getCellState(1, 2);
      expect(blockedCell.dotCount).toBe(0);
      expect(blockedCell.isBlocked).toBe(true);

      // Other adjacent cells should receive dots
      expect(manager.getCellState(3, 2).dotCount).toBe(1);
      expect(manager.getCellState(2, 1).dotCount).toBe(1);
      expect(manager.getCellState(2, 3).dotCount).toBe(1);
    });

    it('should handle corner cell explosions', () => {
      boardStateManager.setCellCapacity(0, 0, 2);
      // Corner cell at (0,0) with capacity 2
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(0, 0, 'red'); // dotCount = 3 > capacity 2

      boardStateManager.explodeCell(0, 0);

      // Only two adjacent cells (right and bottom) should receive dots
      expect(boardStateManager.getCellState(0, 1).dotCount).toBe(1);
      expect(boardStateManager.getCellState(1, 0).dotCount).toBe(1);

      // Cell should have 1 dot remaining (3 - 2 = 1)
      expect(boardStateManager.getCellState(0, 0).dotCount).toBe(1);
      expect(boardStateManager.getCellState(0, 0).owner).toBe('red');
    });

    it('should handle edge cell explosions', () => {
      boardStateManager.setCellCapacity(0, 2, 3);
      // Edge cell at (0,2) with capacity 3
      boardStateManager.placeDot(0, 2, 'blue');
      boardStateManager.placeDot(0, 2, 'blue');
      boardStateManager.placeDot(0, 2, 'blue');
      boardStateManager.placeDot(0, 2, 'blue'); // dotCount = 4 > capacity 3

      boardStateManager.explodeCell(0, 2);

      // Three adjacent cells should receive dots
      expect(boardStateManager.getCellState(0, 1).dotCount).toBe(1);
      expect(boardStateManager.getCellState(0, 3).dotCount).toBe(1);
      expect(boardStateManager.getCellState(1, 2).dotCount).toBe(1);

      // Cell should have 1 dot remaining (4 - 3 = 1)
      expect(boardStateManager.getCellState(0, 2).dotCount).toBe(1);
      expect(boardStateManager.getCellState(0, 2).owner).toBe('blue');
    });
  });

  describe('checkWinCondition', () => {
    beforeEach(() => {
      boardStateManager = new BoardStateManager(3, []);
    });

    it('should return null when there are empty cells', () => {
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(1, 1, 'blue');

      expect(boardStateManager.checkWinCondition()).toBeNull();
    });

    it('should return "red" when red owns all non-blocked cells', () => {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          boardStateManager.placeDot(row, col, 'red');
        }
      }

      expect(boardStateManager.checkWinCondition()).toBe('red');
    });

    it('should return "blue" when blue owns all non-blocked cells', () => {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          boardStateManager.placeDot(row, col, 'blue');
        }
      }

      expect(boardStateManager.checkWinCondition()).toBe('blue');
    });

    it('should ignore blocked cells in win condition', () => {
      const blockedCells = [{ row: 1, col: 1 }];
      const manager = new BoardStateManager(3, blockedCells);

      // Fill all non-blocked cells with red
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (!(row === 1 && col === 1)) {
            manager.placeDot(row, col, 'red');
          }
        }
      }

      expect(manager.checkWinCondition()).toBe('red');
    });

    it('should return null when board has both red and blue cells', () => {
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(1, 1, 'blue');
      boardStateManager.placeDot(2, 2, 'red');

      // Fill remaining cells with red
      boardStateManager.placeDot(0, 1, 'red');
      boardStateManager.placeDot(0, 2, 'red');
      boardStateManager.placeDot(1, 0, 'red');
      boardStateManager.placeDot(1, 2, 'red');
      boardStateManager.placeDot(2, 0, 'red');
      boardStateManager.placeDot(2, 1, 'red');

      expect(boardStateManager.checkWinCondition()).toBeNull();
    });
  });

  describe('getState and setState', () => {
    it('should return board state', () => {
      boardStateManager = new BoardStateManager(3, []);
      const state1 = boardStateManager.getState();
      const state2 = boardStateManager.getState();

      expect(state1).toEqual(state2);
      expect(state1).toBe(state2); // Same reference (not deep copied)
    });

    it('should set board state', () => {
      boardStateManager = new BoardStateManager(3, []);
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(1, 1, 'blue');

      const state = boardStateManager.getState();
      const newManager = new BoardStateManager(3);
      newManager.setState(state);

      expect(newManager.getCellState(0, 0).owner).toBe('red');
      expect(newManager.getCellState(1, 1).owner).toBe('blue');
    });

    it('should share state reference when setting', () => {
      boardStateManager = new BoardStateManager(3, []);
      const state: CellState[][] = [
        [
          { owner: 'red', dotCount: 1, capacity: 2, isBlocked: false },
          { owner: 'default', dotCount: 0, capacity: 3, isBlocked: false },
          { owner: 'default', dotCount: 0, capacity: 2, isBlocked: false },
        ],
        [
          { owner: 'default', dotCount: 0, capacity: 3, isBlocked: false },
          { owner: 'blue', dotCount: 2, capacity: 4, isBlocked: false },
          { owner: 'default', dotCount: 0, capacity: 3, isBlocked: false },
        ],
        [
          { owner: 'default', dotCount: 0, capacity: 2, isBlocked: false },
          { owner: 'default', dotCount: 0, capacity: 3, isBlocked: false },
          { owner: 'default', dotCount: 0, capacity: 2, isBlocked: false },
        ],
      ];

      boardStateManager.setState(state);
      boardStateManager.placeDot(0, 0, 'red'); // Modify internal state

      // Original state will be mutated since setState doesn't deep copy
      expect(state[0][0].dotCount).toBe(2);
      expect(boardStateManager.getCellState(0, 0).dotCount).toBe(2);
    });
  });

  describe('getCellState', () => {
    beforeEach(() => {
      boardStateManager = new BoardStateManager(3, []);
    });

    it('should return cell state at specified position', () => {
      boardStateManager.placeDot(1, 2, 'red');
      const cell = boardStateManager.getCellState(1, 2);

      expect(cell.owner).toBe('red');
      expect(cell.dotCount).toBe(1);
    });

    it('should return cell state for default cell', () => {
      const cell = boardStateManager.getCellState(0, 0);

      expect(cell.owner).toBe('default');
      expect(cell.dotCount).toBe(0);
    });

    it('should return cell state for blocked cell', () => {
      const blockedCells = [{ row: 1, col: 1 }];
      const manager = new BoardStateManager(3, blockedCells);
      const cell = manager.getCellState(1, 1);

      expect(cell.isBlocked).toBe(true);
      expect(cell.owner).toBe('blocked');
    });
  });

  describe('getValidMoves', () => {
    beforeEach(() => {
      boardStateManager = new BoardStateManager(3, []);
    });

    it('should return all empty cells for first move', () => {
      const validMoves = boardStateManager.getValidMoves('red');

      expect(validMoves.length).toBe(9);
    });

    it('should return empty cells and own cells', () => {
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(1, 1, 'blue');

      const validMoves = boardStateManager.getValidMoves('red');

      expect(validMoves.length).toBe(8); // 7 empty + 1 red cell
      expect(validMoves).toContainEqual({ row: 0, col: 0 });
      expect(validMoves).not.toContainEqual({ row: 1, col: 1 }); // Blue cell
    });

    it('should not return opponent cells', () => {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (row !== 1 || col !== 1) {
            boardStateManager.placeDot(row, col, 'red');
          }
        }
      }
      boardStateManager.placeDot(1, 1, 'blue');

      const validMoves = boardStateManager.getValidMoves('red');

      expect(validMoves.length).toBe(8); // All red cells
      expect(validMoves).not.toContainEqual({ row: 1, col: 1 }); // Blue cell
    });

    it('should not return blocked cells', () => {
      const blockedCells = [{ row: 1, col: 1 }];
      const manager = new BoardStateManager(3, blockedCells);

      const validMoves = manager.getValidMoves('red');

      expect(validMoves.length).toBe(8); // 9 - 1 blocked
      expect(validMoves).not.toContainEqual({ row: 1, col: 1 });
    });

    it('should return empty array when no valid moves', () => {
      // Fill all cells with blue
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          boardStateManager.placeDot(row, col, 'blue');
        }
      }

      const validMoves = boardStateManager.getValidMoves('red');

      expect(validMoves.length).toBe(0);
    });
  });

  describe('getCellsToExplode', () => {
    beforeEach(() => {
      boardStateManager = new BoardStateManager(5, []);
      boardStateManager.setCellCapacity(0, 0, 2);
      boardStateManager.setCellCapacity(4, 4, 2);
      boardStateManager.setCellCapacity(2, 2, 4);
    });

    it('should return cells that will explode', () => {
      // Set up cells at capacity
      boardStateManager.placeDot(0, 0, 'red'); // capacity 2
      boardStateManager.placeDot(0, 0, 'red'); // dotCount = 2

      boardStateManager.placeDot(2, 2, 'blue'); // capacity 4
      boardStateManager.placeDot(2, 2, 'blue');
      boardStateManager.placeDot(2, 2, 'blue');
      boardStateManager.placeDot(2, 2, 'blue'); // dotCount = 4

      const cellsToExplode = boardStateManager.getCellsToExplode();

      expect(cellsToExplode.length).toBe(0); // At capacity, not over
    });

    it('should return empty array when no cells will explode', () => {
      // Set capacity for cells we're testing
      boardStateManager.setCellCapacity(1, 1, 4);

      // Place dots on cells with enough capacity
      boardStateManager.placeDot(0, 0, 'red'); // capacity 2, dotCount 1
      boardStateManager.placeDot(1, 1, 'blue'); // capacity 4, dotCount 1

      const cellsToExplode = boardStateManager.getCellsToExplode();

      expect(cellsToExplode.length).toBe(0);
    });

    it('should return multiple cells that will explode', () => {
      // Set up multiple cells over capacity
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(0, 0, 'red');
      boardStateManager.placeDot(0, 0, 'red'); // dotCount = 3 > capacity 2

      boardStateManager.placeDot(4, 4, 'blue');
      boardStateManager.placeDot(4, 4, 'blue');
      boardStateManager.placeDot(4, 4, 'blue'); // dotCount = 3 > capacity 2

      const cellsToExplode = boardStateManager.getCellsToExplode();

      expect(cellsToExplode.length).toBe(2);
      expect(cellsToExplode).toContainEqual({ row: 0, col: 0 });
      expect(cellsToExplode).toContainEqual({ row: 4, col: 4 });
    });
  });

  describe('getGridSize', () => {
    it('should return grid size', () => {
      const manager = new BoardStateManager(5);
      expect(manager.getGridSize()).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle fully blocked board', () => {
      const blockedCells = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ];
      const manager = new BoardStateManager(2, blockedCells);

      const validMoves = manager.getValidMoves('red');
      expect(validMoves.length).toBe(0);

      const winner = manager.checkWinCondition();
      expect(winner).toBeNull(); // No winner when all cells blocked
    });

    it('should handle board with only one non-blocked cell', () => {
      const blockedCells = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ];
      const manager = new BoardStateManager(2, blockedCells);

      const validMoves = manager.getValidMoves('red');
      expect(validMoves.length).toBe(1);
      expect(validMoves[0]).toEqual({ row: 1, col: 1 });

      manager.placeDot(1, 1, 'red');
      const winner = manager.checkWinCondition();
      expect(winner).toBe('red');
    });

    it('should handle chain reaction setup', () => {
      const manager = new BoardStateManager(3, []);
      manager.setCellCapacity(0, 0, 2);
      manager.setCellCapacity(0, 1, 3);

      // Set up cells at capacity - 1
      manager.placeDot(0, 0, 'red');
      manager.placeDot(0, 1, 'red');
      manager.placeDot(0, 1, 'red');

      // This should trigger explosion at (0,0)
      manager.placeDot(0, 0, 'red');
      manager.placeDot(0, 0, 'red'); // dotCount = 3 > capacity 2

      expect(manager.shouldExplode(0, 0)).toBe(true);

      // Explode and verify (0,1) now has 3 dots and will explode
      manager.explodeCell(0, 0);
      expect(manager.getCellState(0, 1).dotCount).toBe(3);
      expect(manager.shouldExplode(0, 1)).toBe(false); // capacity 3, dotCount 3
    });
  });
});
