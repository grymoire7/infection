import { describe, it, expect } from 'vitest';
import { ComputerPlayer } from './ComputerPlayer';
import { CellState } from './GameStateManager';

describe('ComputerPlayer', () => {
  // Helper to create a sample board state
  const createBoardState = (gridSize: number): CellState[][] => {
    const board: CellState[][] = [];
    for (let row = 0; row < gridSize; row++) {
      board[row] = [];
      for (let col = 0; col < gridSize; col++) {
        // Default: corners have capacity 2, edges 3, interior 4
        let capacity = 4;
        if ((row === 0 || row === gridSize - 1) && (col === 0 || col === gridSize - 1)) {
          capacity = 2; // corner
        } else if (row === 0 || row === gridSize - 1 || col === 0 || col === gridSize - 1) {
          capacity = 3; // edge
        }

        board[row][col] = {
          dotCount: 0,
          owner: 'default',
          capacity,
          isBlocked: false,
        };
      }
    }
    return board;
  };

  describe('Constructor', () => {
    it('should create computer player with difficulty and color', () => {
      const player = new ComputerPlayer('easy', 'red');

      expect(player.getDifficulty()).toBe('easy');
      expect(player.getColor()).toBe('red');
    });

    it('should create blue computer player', () => {
      const player = new ComputerPlayer('medium', 'blue');

      expect(player.getColor()).toBe('blue');
    });
  });

  describe('getDifficulty', () => {
    it('should return current difficulty', () => {
      const player = new ComputerPlayer('hard', 'red');

      expect(player.getDifficulty()).toBe('hard');
    });
  });

  describe('getColor', () => {
    it('should return player color', () => {
      const player = new ComputerPlayer('easy', 'blue');

      expect(player.getColor()).toBe('blue');
    });
  });

  describe('setDifficulty', () => {
    it('should update difficulty level', () => {
      const player = new ComputerPlayer('easy', 'red');

      player.setDifficulty('expert');

      expect(player.getDifficulty()).toBe('expert');
    });
  });

  describe('findMove', () => {
    it('should return valid move for easy difficulty', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(3);

      const move = player.findMove(boardState, 3);

      expect(move.row).toBeGreaterThanOrEqual(0);
      expect(move.row).toBeLessThan(3);
      expect(move.col).toBeGreaterThanOrEqual(0);
      expect(move.col).toBeLessThan(3);
    });

    it('should return valid move for medium difficulty', () => {
      const player = new ComputerPlayer('medium', 'blue');
      const boardState = createBoardState(3);

      const move = player.findMove(boardState, 3);

      expect(move.row).toBeGreaterThanOrEqual(0);
      expect(move.col).toBeGreaterThanOrEqual(0);
    });

    it('should return valid move for hard difficulty', () => {
      const player = new ComputerPlayer('hard', 'red');
      const boardState = createBoardState(3);

      const move = player.findMove(boardState, 3);

      expect(move.row).toBeGreaterThanOrEqual(0);
      expect(move.col).toBeGreaterThanOrEqual(0);
    });

    it('should return valid move for expert difficulty', () => {
      const player = new ComputerPlayer('expert', 'blue');
      const boardState = createBoardState(3);

      const move = player.findMove(boardState, 3);

      expect(move.row).toBeGreaterThanOrEqual(0);
      expect(move.col).toBeGreaterThanOrEqual(0);
    });

    it('should fall back to easy for unknown difficulty', () => {
      const player = new ComputerPlayer('unknown', 'red');
      const boardState = createBoardState(3);

      const move = player.findMove(boardState, 3);

      expect(move).toBeDefined();
      expect(move.row).toBeGreaterThanOrEqual(0);
    });

    it('should handle case-insensitive difficulty', () => {
      const player = new ComputerPlayer('EASY', 'red');
      const boardState = createBoardState(3);

      const move = player.findMove(boardState, 3);

      expect(move).toBeDefined();
    });

    it('should throw error when no valid moves available', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(2);

      // Block all cells
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          boardState[row][col].isBlocked = true;
        }
      }

      expect(() => {
        player.findMove(boardState, 2);
      }).toThrow('No valid moves available');
    });

    it('should not select blocked cells', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(3);

      // Block center cell
      boardState[1][1].isBlocked = true;

      const move = player.findMove(boardState, 3);

      expect(move.row !== 1 || move.col !== 1).toBe(true);
    });

    it('should select empty cells', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(3);

      const move = player.findMove(boardState, 3);

      expect(boardState[move.row][move.col].dotCount).toBe(0);
    });

    it('should select own cells', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(3);

      // Mark some cells as owned by player
      boardState[0][0].owner = 'red';
      boardState[0][0].dotCount = 1;

      const move = player.findMove(boardState, 3);

      const cell = boardState[move.row][move.col];
      expect(cell.owner === 'red' || cell.owner === 'default').toBe(true);
    });

    it('should not select opponent cells', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(3);

      // Fill board with opponent cells, leaving one empty
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (row !== 2 || col !== 2) {
            boardState[row][col].owner = 'blue';
            boardState[row][col].dotCount = 1;
          }
        }
      }

      const move = player.findMove(boardState, 3);

      // Should pick the only valid move: (2, 2)
      expect(move.row).toBe(2);
      expect(move.col).toBe(2);
    });
  });

  describe('Easy AI Strategy', () => {
    it('should make random moves', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(5);

      // Make multiple moves and check they vary
      const moves = new Set();
      for (let i = 0; i < 10; i++) {
        const move = player.findMove(boardState, 5);
        moves.add(`${move.row},${move.col}`);
      }

      // Should have some variety (not all the same)
      expect(moves.size).toBeGreaterThan(1);
    });
  });

  describe('Medium AI Strategy', () => {
    it('should prioritize fully loaded cells', () => {
      const player = new ComputerPlayer('medium', 'red');
      const boardState = createBoardState(3);

      // Create a fully loaded cell
      boardState[1][1].owner = 'red';
      boardState[1][1].dotCount = 4;
      boardState[1][1].capacity = 4;

      const move = player.findMove(boardState, 3);

      // Should pick the fully loaded cell
      expect(move.row).toBe(1);
      expect(move.col).toBe(1);
    });

    it('should prefer corner cells when no full cells available', () => {
      const player = new ComputerPlayer('medium', 'red');
      const boardState = createBoardState(3);

      const move = player.findMove(boardState, 3);
      const cell = boardState[move.row][move.col];

      // Should prefer corners or edges
      expect(cell.capacity).toBeLessThanOrEqual(3);
    });

    it('should prefer corners over edges', () => {
      const player = new ComputerPlayer('medium', 'red');
      const boardState = createBoardState(5);

      // Block all edge cells, leave corners
      for (let i = 0; i < 5; i++) {
        if (i !== 0 && i !== 4) {
          boardState[0][i].isBlocked = true;
          boardState[4][i].isBlocked = true;
          boardState[i][0].isBlocked = true;
          boardState[i][4].isBlocked = true;
        }
      }

      const move = player.findMove(boardState, 5);

      // Should pick a corner
      expect((move.row === 0 || move.row === 4) && (move.col === 0 || move.col === 4)).toBe(true);
    });
  });

  describe('Hard AI Strategy', () => {
    it('should prioritize full cell next to opponent full cell', () => {
      const player = new ComputerPlayer('hard', 'red');
      const boardState = createBoardState(5);

      // Create adjacent full cells
      boardState[2][2].owner = 'red';
      boardState[2][2].dotCount = 4;
      boardState[2][2].capacity = 4;

      boardState[2][3].owner = 'blue';
      boardState[2][3].dotCount = 4;
      boardState[2][3].capacity = 4;

      const move = player.findMove(boardState, 5);

      // Should pick the red full cell
      expect(move.row).toBe(2);
      expect(move.col).toBe(2);
    });

    it('should prioritize full cell next to any opponent cell', () => {
      const player = new ComputerPlayer('hard', 'red');
      const boardState = createBoardState(5);

      // Create full cell next to opponent cell
      boardState[2][2].owner = 'red';
      boardState[2][2].dotCount = 4;
      boardState[2][2].capacity = 4;

      boardState[2][3].owner = 'blue';
      boardState[2][3].dotCount = 1;

      const move = player.findMove(boardState, 5);

      // Should pick the red full cell
      expect(move.row).toBe(2);
      expect(move.col).toBe(2);
    });

    it('should fall back to medium strategy when no tactical moves', () => {
      const player = new ComputerPlayer('hard', 'red');
      const boardState = createBoardState(3);

      // No full cells, no opponent cells
      const move = player.findMove(boardState, 3);

      // Should use medium strategy (prefer low capacity)
      const cell = boardState[move.row][move.col];
      expect(cell.capacity).toBeLessThanOrEqual(3);
    });
  });

  describe('Expert AI Strategy', () => {
    it('should use advantage cell strategy', () => {
      const player = new ComputerPlayer('expert', 'red');
      const boardState = createBoardState(5);

      // Create advantage cell scenario
      boardState[2][2].owner = 'red';
      boardState[2][2].dotCount = 3; // ullage = 1
      boardState[2][2].capacity = 4;

      boardState[2][3].owner = 'blue';
      boardState[2][3].dotCount = 2; // ullage = 2
      boardState[2][3].capacity = 4;

      const move = player.findMove(boardState, 5);

      // Expert AI should make a strategic move
      expect(move).toBeDefined();
      expect(move.row).toBeGreaterThanOrEqual(0);
    });

    it('should prioritize full cells over advantage cells', () => {
      const player = new ComputerPlayer('expert', 'red');
      const boardState = createBoardState(5);

      // Full cell
      boardState[1][1].owner = 'red';
      boardState[1][1].dotCount = 4;
      boardState[1][1].capacity = 4;

      // Advantage cell
      boardState[3][3].owner = 'red';
      boardState[3][3].dotCount = 3;
      boardState[3][3].capacity = 4;

      boardState[3][4].owner = 'blue';
      boardState[3][4].dotCount = 2;
      boardState[3][4].capacity = 4;

      const move = player.findMove(boardState, 5);

      // Should pick full cell first
      expect(move.row).toBe(1);
      expect(move.col).toBe(1);
    });

    it('should handle complex board states', () => {
      const player = new ComputerPlayer('expert', 'blue');
      const boardState = createBoardState(5);

      // Mix of red and blue cells
      boardState[0][0].owner = 'red';
      boardState[0][0].dotCount = 1;

      boardState[0][1].owner = 'blue';
      boardState[0][1].dotCount = 1;

      boardState[1][0].owner = 'red';
      boardState[1][0].dotCount = 2;

      const move = player.findMove(boardState, 5);

      // Should find a valid move
      expect(move).toBeDefined();
      const cell = boardState[move.row][move.col];
      expect(cell.owner === 'blue' || cell.owner === 'default').toBe(true);
    });
  });

  describe('Valid Move Logic', () => {
    it('should allow moves on empty cells', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(3);

      const move = player.findMove(boardState, 3);

      const cell = boardState[move.row][move.col];
      expect(cell.dotCount).toBe(0);
      expect(cell.owner).toBe('default');
    });

    it('should allow moves on own cells', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(3);

      // Set all cells to owned by red
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          boardState[row][col].owner = 'red';
          boardState[row][col].dotCount = 1;
        }
      }

      const move = player.findMove(boardState, 3);

      const cell = boardState[move.row][move.col];
      expect(cell.owner).toBe('red');
    });

    it('should not allow moves on opponent cells', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(3);

      // Set most cells to opponent, leave one empty
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (row !== 1 || col !== 1) {
            boardState[row][col].owner = 'blue';
            boardState[row][col].dotCount = 1;
          }
        }
      }

      const move = player.findMove(boardState, 3);

      expect(move.row).toBe(1);
      expect(move.col).toBe(1);
    });

    it('should not allow moves on blocked cells', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(3);

      // Block some cells
      boardState[0][0].isBlocked = true;
      boardState[1][1].isBlocked = true;
      boardState[2][2].isBlocked = true;

      const move = player.findMove(boardState, 3);

      const cell = boardState[move.row][move.col];
      expect(cell.isBlocked).toBe(false);
    });

    it('should handle grid with single valid move', () => {
      const player = new ComputerPlayer('easy', 'blue');
      const boardState = createBoardState(2);

      // Block three cells
      boardState[0][0].isBlocked = true;
      boardState[0][1].isBlocked = true;
      boardState[1][0].isBlocked = true;

      const move = player.findMove(boardState, 2);

      expect(move.row).toBe(1);
      expect(move.col).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 1x1 grid', () => {
      const player = new ComputerPlayer('easy', 'red');
      const boardState = createBoardState(1);

      const move = player.findMove(boardState, 1);

      expect(move.row).toBe(0);
      expect(move.col).toBe(0);
    });

    it('should handle large grid (20x20)', () => {
      const player = new ComputerPlayer('medium', 'blue');
      const boardState = createBoardState(20);

      const move = player.findMove(boardState, 20);

      expect(move.row).toBeGreaterThanOrEqual(0);
      expect(move.row).toBeLessThan(20);
      expect(move.col).toBeGreaterThanOrEqual(0);
      expect(move.col).toBeLessThan(20);
    });

    it('should handle board with all cells owned by player', () => {
      const player = new ComputerPlayer('hard', 'red');
      const boardState = createBoardState(3);

      // Set all cells to owned by red
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          boardState[row][col].owner = 'red';
          boardState[row][col].dotCount = 1;
        }
      }

      const move = player.findMove(boardState, 3);

      expect(move).toBeDefined();
    });

    it('should handle board with one cell per player', () => {
      const player = new ComputerPlayer('expert', 'red');
      const boardState = createBoardState(3);

      boardState[0][0].owner = 'red';
      boardState[0][0].dotCount = 1;

      boardState[2][2].owner = 'blue';
      boardState[2][2].dotCount = 1;

      const move = player.findMove(boardState, 3);

      expect(move).toBeDefined();
      const cell = boardState[move.row][move.col];
      expect(cell.owner === 'red' || cell.owner === 'default').toBe(true);
    });
  });

  describe('Strategy Consistency', () => {
    it('should always return same move for deterministic scenarios (full cell)', () => {
      const player = new ComputerPlayer('medium', 'red');
      const boardState = createBoardState(3);

      // Create single full cell
      boardState[1][1].owner = 'red';
      boardState[1][1].dotCount = 4;
      boardState[1][1].capacity = 4;

      const move1 = player.findMove(boardState, 3);
      const move2 = player.findMove(boardState, 3);

      expect(move1.row).toBe(move2.row);
      expect(move1.col).toBe(move2.col);
    });

    it('should handle difficulty change mid-game', () => {
      const player = new ComputerPlayer('easy', 'blue');
      const boardState = createBoardState(5);

      const easyMove = player.findMove(boardState, 5);
      expect(easyMove).toBeDefined();

      player.setDifficulty('expert');

      const expertMove = player.findMove(boardState, 5);
      expect(expertMove).toBeDefined();
    });
  });

  describe('Integration with Different Colors', () => {
    it('should handle red player correctly', () => {
      const player = new ComputerPlayer('hard', 'red');
      const boardState = createBoardState(5);

      boardState[2][2].owner = 'blue';
      boardState[2][2].dotCount = 2;

      const move = player.findMove(boardState, 5);

      const cell = boardState[move.row][move.col];
      expect(cell.owner === 'red' || cell.owner === 'default').toBe(true);
    });

    it('should handle blue player correctly', () => {
      const player = new ComputerPlayer('hard', 'blue');
      const boardState = createBoardState(5);

      boardState[2][2].owner = 'red';
      boardState[2][2].dotCount = 2;

      const move = player.findMove(boardState, 5);

      const cell = boardState[move.row][move.col];
      expect(cell.owner === 'blue' || cell.owner === 'default').toBe(true);
    });

    it('should correctly identify opponent color', () => {
      const redPlayer = new ComputerPlayer('hard', 'red');
      const bluePlayer = new ComputerPlayer('hard', 'blue');
      const boardState = createBoardState(5);

      // Full cell next to opponent
      boardState[2][2].owner = 'red';
      boardState[2][2].dotCount = 4;
      boardState[2][2].capacity = 4;

      boardState[2][3].owner = 'blue';
      boardState[2][3].dotCount = 4;
      boardState[2][3].capacity = 4;

      const redMove = redPlayer.findMove(boardState, 5);
      expect(redMove.row).toBe(2);
      expect(redMove.col).toBe(2);

      const blueMove = bluePlayer.findMove(boardState, 5);
      expect(blueMove.row).toBe(2);
      expect(blueMove.col).toBe(3);
    });
  });
});
