import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GridManager } from './GridManager';
import { CellState } from './GameStateManager';

// Mock Phaser's Rectangle GameObject
class MockRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: number;
  strokeColor: number;
  strokeWidth: number;
  interactive: boolean = false;
  private eventHandlers: Map<string, Function> = new Map();

  constructor(x: number, y: number, width: number, height: number, fillColor: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fillColor = fillColor;
  }

  setStrokeStyle(width: number, color: number): this {
    this.strokeWidth = width;
    this.strokeColor = color;
    return this;
  }

  setFillStyle(color: number): this {
    this.fillColor = color;
    return this;
  }

  setInteractive(): this {
    this.interactive = true;
    return this;
  }

  disableInteractive(): this {
    this.interactive = false;
    return this;
  }

  on(event: string, handler: Function): this {
    this.eventHandlers.set(event, handler);
    return this;
  }

  emit(event: string): void {
    const handler = this.eventHandlers.get(event);
    if (handler) handler();
  }
}

// Mock Phaser's Sprite GameObject
class MockSprite {
  x: number;
  y: number;
  width: number = 64;
  height: number = 64;
  scaleX: number = 1;
  scaleY: number = 1;
  flipX: boolean = false;

  constructor(x: number, y: number, _texture: string) {
    this.x = x;
    this.y = y;
  }

  setScale(scale: number): this {
    this.scaleX = scale;
    this.scaleY = scale;
    return this;
  }

  toggleFlipX(): this {
    this.flipX = !this.flipX;
    return this;
  }

  play(_anim: string): this {
    return this;
  }
}

// Mock Phaser's Scene
class MockScene {
  cameras = {
    main: {
      width: 800,
      height: 600,
    },
  };

  add = {
    rectangle: vi.fn((x: number, y: number, width: number, height: number, color: number) => {
      return new MockRectangle(x, y, width, height, color);
    }),
    sprite: vi.fn((x: number, y: number, texture: string) => {
      return new MockSprite(x, y, texture);
    }),
  };
}

describe('GridManager', () => {
  let mockScene: MockScene;
  let gridManager: GridManager;

  // Helper to create a sample board state
  const createBoardState = (gridSize: number, blockedCells: { row: number; col: number }[] = []): CellState[][] => {
    const board: CellState[][] = [];
    for (let row = 0; row < gridSize; row++) {
      board[row] = [];
      for (let col = 0; col < gridSize; col++) {
        const isBlocked = blockedCells.some(cell => cell.row === row && cell.col === col);
        board[row][col] = {
          dotCount: 0,
          owner: 'default',
          capacity: 0,
          isBlocked,
        };
      }
    }
    return board;
  };

  beforeEach(() => {
    mockScene = new MockScene();
    gridManager = new GridManager(mockScene as any);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create grid manager with scene reference', () => {
      expect(gridManager).toBeDefined();
    });
  });

  describe('createGrid', () => {
    it('should create grid of correct size', () => {
      const result = gridManager.createGrid(3, []);

      expect(result.grid.length).toBe(3);
      expect(result.grid[0].length).toBe(3);
    });

    it('should create all grid cells', () => {
      const gridSize = 5;
      gridManager.createGrid(gridSize, []);

      expect(mockScene.add.rectangle).toHaveBeenCalledTimes(gridSize * gridSize);
    });

    it('should return grid metadata', () => {
      const result = gridManager.createGrid(3, []);

      expect(result.grid).toBeDefined();
      expect(result.gridStartX).toBeGreaterThan(0);
      expect(result.gridStartY).toBeGreaterThan(0);
      expect(result.cellSize).toBeGreaterThan(0);
    });

    it('should handle blocked cells', () => {
      const blockedCells = [{ row: 0, col: 0 }, { row: 2, col: 2 }];
      gridManager.createGrid(3, blockedCells);

      // Blocked cells should have sprites created
      expect(mockScene.add.sprite).toHaveBeenCalledTimes(2);
    });

    it('should limit cell size to MAX_CELL_SIZE (80)', () => {
      const result = gridManager.createGrid(3, []);

      expect(result.cellSize).toBeLessThanOrEqual(80);
    });

    it('should enforce minimum cell size MIN_CELL_SIZE (40)', () => {
      const result = gridManager.createGrid(50, []); // Very large grid

      expect(result.cellSize).toBeGreaterThanOrEqual(40);
    });

    it('should center grid on screen', () => {
      const result = gridManager.createGrid(5, []);

      const totalGridWidth = 5 * result.cellSize;
      const expectedStartX = (800 - totalGridWidth) / 2 + result.cellSize / 2;

      expect(result.gridStartX).toBe(expectedStartX);
    });
  });

  describe('calculateCellCapacity', () => {
    it('should calculate capacity 4 for interior cell', () => {
      gridManager.createGrid(5, []); // Need to create grid first
      const boardState = createBoardState(5, []);

      const capacity = gridManager.calculateCellCapacity(2, 2, boardState);

      expect(capacity).toBe(4);
    });

    it('should calculate capacity 2 for corner cell (top-left)', () => {
      gridManager.createGrid(5, []);
      const boardState = createBoardState(5, []);

      const capacity = gridManager.calculateCellCapacity(0, 0, boardState);

      expect(capacity).toBe(2);
    });

    it('should calculate capacity 2 for corner cell (bottom-right)', () => {
      gridManager.createGrid(5, []);
      const boardState = createBoardState(5, []);

      const capacity = gridManager.calculateCellCapacity(4, 4, boardState);

      expect(capacity).toBe(2);
    });

    it('should calculate capacity 3 for edge cell', () => {
      gridManager.createGrid(5, []);
      const boardState = createBoardState(5, []);

      const capacity = gridManager.calculateCellCapacity(0, 2, boardState);

      expect(capacity).toBe(3);
    });

    it('should exclude blocked adjacent cells from capacity', () => {
      const blockedCells = [{ row: 1, col: 2 }, { row: 3, col: 2 }];
      gridManager.createGrid(5, blockedCells);
      const boardState = createBoardState(5, blockedCells);

      // Cell at (2, 2) has blocked cells above and below
      const capacity = gridManager.calculateCellCapacity(2, 2, boardState);

      expect(capacity).toBe(2); // Only left and right
    });

    it('should handle cell surrounded by blocked cells', () => {
      const blockedCells = [
        { row: 1, col: 2 },
        { row: 3, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 3 },
      ];
      const boardState = createBoardState(5, blockedCells);

      const capacity = gridManager.calculateCellCapacity(2, 2, boardState);

      expect(capacity).toBe(0);
    });

    it('should handle single cell grid', () => {
      const boardState = createBoardState(1, []);

      const capacity = gridManager.calculateCellCapacity(0, 0, boardState);

      expect(capacity).toBe(0);
    });

    it('should calculate capacity correctly for 3x3 grid edges', () => {
      gridManager.createGrid(3, []);
      const boardState = createBoardState(3, []);

      // Corners should be 2
      expect(gridManager.calculateCellCapacity(0, 0, boardState)).toBe(2);
      expect(gridManager.calculateCellCapacity(0, 2, boardState)).toBe(2);
      expect(gridManager.calculateCellCapacity(2, 0, boardState)).toBe(2);
      expect(gridManager.calculateCellCapacity(2, 2, boardState)).toBe(2);

      // Edges should be 3
      expect(gridManager.calculateCellCapacity(0, 1, boardState)).toBe(3);
      expect(gridManager.calculateCellCapacity(1, 0, boardState)).toBe(3);
      expect(gridManager.calculateCellCapacity(1, 2, boardState)).toBe(3);
      expect(gridManager.calculateCellCapacity(2, 1, boardState)).toBe(3);

      // Center should be 4
      expect(gridManager.calculateCellCapacity(1, 1, boardState)).toBe(4);
    });

    it('should only check orthogonal neighbors, not diagonals', () => {
      gridManager.createGrid(3, []);
      const boardState = createBoardState(3, []);

      // For corner cell (0,0), diagonal cells should not affect capacity
      const capacity = gridManager.calculateCellCapacity(0, 0, boardState);

      expect(capacity).toBe(2); // Only right and down
    });
  });

  describe('makeCellInteractive', () => {
    it('should make non-blocked cell interactive', () => {
      const result = gridManager.createGrid(3, []);
      const mockHandlers = {
        onHover: vi.fn(),
        onOut: vi.fn(),
        onClick: vi.fn(),
      };

      gridManager.makeCellInteractive(0, 0, mockHandlers.onHover, mockHandlers.onOut, mockHandlers.onClick);

      const cell = result.grid[0][0] as any;
      expect(cell.interactive).toBe(true);
    });

    it('should register hover handler', () => {
      const result = gridManager.createGrid(3, []);
      const onHover = vi.fn();

      gridManager.makeCellInteractive(0, 0, onHover, vi.fn(), vi.fn());

      const cell = result.grid[0][0] as any;
      cell.emit('pointerover');

      expect(onHover).toHaveBeenCalled();
    });

    it('should register pointerout handler', () => {
      const result = gridManager.createGrid(3, []);
      const onOut = vi.fn();

      gridManager.makeCellInteractive(0, 0, vi.fn(), onOut, vi.fn());

      const cell = result.grid[0][0] as any;
      cell.emit('pointerout');

      expect(onOut).toHaveBeenCalled();
    });

    it('should register click handler', () => {
      const result = gridManager.createGrid(3, []);
      const onClick = vi.fn();

      gridManager.makeCellInteractive(0, 0, vi.fn(), vi.fn(), onClick);

      const cell = result.grid[0][0] as any;
      cell.emit('pointerdown');

      expect(onClick).toHaveBeenCalled();
    });

    it('should not make blocked cell interactive', () => {
      const blockedCells = [{ row: 1, col: 1 }];
      const result = gridManager.createGrid(3, blockedCells);

      gridManager.makeCellInteractive(1, 1, vi.fn(), vi.fn(), vi.fn());

      const cell = result.grid[1][1] as any;
      expect(cell.interactive).toBe(false);
    });
  });

  describe('updateCellOwnership', () => {
    it('should update cell fill color for red owner', () => {
      const result = gridManager.createGrid(3, []);
      const cellState: CellState = {
        dotCount: 1,
        owner: 'red',
        capacity: 4,
        isBlocked: false,
      };

      gridManager.updateCellOwnership(1, 1, cellState);

      const cell = result.grid[1][1] as any;
      expect(cell.fillColor).toBe(0x664444);
    });

    it('should update cell fill color for blue owner', () => {
      const result = gridManager.createGrid(3, []);
      const cellState: CellState = {
        dotCount: 1,
        owner: 'blue',
        capacity: 4,
        isBlocked: false,
      };

      gridManager.updateCellOwnership(1, 1, cellState);

      const cell = result.grid[1][1] as any;
      expect(cell.fillColor).toBe(0x444466);
    });

    it('should update cell fill color for default owner', () => {
      const result = gridManager.createGrid(3, []);
      const cellState: CellState = {
        dotCount: 0,
        owner: 'default',
        capacity: 4,
        isBlocked: false,
      };

      gridManager.updateCellOwnership(1, 1, cellState);

      const cell = result.grid[1][1] as any;
      expect(cell.fillColor).toBe(0x444444);
    });

    it('should update stroke color', () => {
      const result = gridManager.createGrid(3, []);
      const cellState: CellState = {
        dotCount: 1,
        owner: 'red',
        capacity: 4,
        isBlocked: false,
      };

      gridManager.updateCellOwnership(1, 1, cellState);

      const cell = result.grid[1][1] as any;
      expect(cell.strokeColor).toBe(0x888888);
      expect(cell.strokeWidth).toBe(2);
    });
  });

  describe('handleCellHover', () => {
    it('should apply hover style to default cell', () => {
      const result = gridManager.createGrid(3, []);
      const cellState: CellState = {
        dotCount: 0,
        owner: 'default',
        capacity: 4,
        isBlocked: false,
      };

      gridManager.handleCellHover(1, 1, cellState);

      const cell = result.grid[1][1] as any;
      expect(cell.fillColor).toBe(0x555555); // hoverFillColor
      expect(cell.strokeColor).toBe(0x888888); // hoverStrokeColor
    });

    it('should apply hover style to red cell', () => {
      const result = gridManager.createGrid(3, []);
      const cellState: CellState = {
        dotCount: 1,
        owner: 'red',
        capacity: 4,
        isBlocked: false,
      };

      gridManager.handleCellHover(1, 1, cellState);

      const cell = result.grid[1][1] as any;
      expect(cell.fillColor).toBe(0x885555);
    });

    it('should apply hover style to blue cell', () => {
      const result = gridManager.createGrid(3, []);
      const cellState: CellState = {
        dotCount: 1,
        owner: 'blue',
        capacity: 4,
        isBlocked: false,
      };

      gridManager.handleCellHover(1, 1, cellState);

      const cell = result.grid[1][1] as any;
      expect(cell.fillColor).toBe(0x555588);
    });

    it('should not apply hover to blocked cell', () => {
      const blockedCells = [{ row: 1, col: 1 }];
      const result = gridManager.createGrid(3, blockedCells);
      const cellState: CellState = {
        dotCount: 0,
        owner: 'blocked',
        capacity: 0,
        isBlocked: true,
      };

      const originalFillColor = (result.grid[1][1] as any).fillColor;
      gridManager.handleCellHover(1, 1, cellState);

      const cell = result.grid[1][1] as any;
      expect(cell.fillColor).toBe(originalFillColor);
    });
  });

  describe('getCellCenter', () => {
    it('should return correct center coordinates for top-left cell', () => {
      const result = gridManager.createGrid(5, []);

      const center = gridManager.getCellCenter(0, 0);

      expect(center.x).toBe(result.gridStartX);
      expect(center.y).toBe(result.gridStartY);
    });

    it('should return correct center coordinates for any cell', () => {
      const result = gridManager.createGrid(5, []);

      const center = gridManager.getCellCenter(2, 3);

      expect(center.x).toBe(result.gridStartX + 3 * result.cellSize);
      expect(center.y).toBe(result.gridStartY + 2 * result.cellSize);
    });

    it('should return correct center for bottom-right cell', () => {
      const result = gridManager.createGrid(5, []);

      const center = gridManager.getCellCenter(4, 4);

      expect(center.x).toBe(result.gridStartX + 4 * result.cellSize);
      expect(center.y).toBe(result.gridStartY + 4 * result.cellSize);
    });
  });

  describe('getGridDimensions', () => {
    it('should return current grid dimensions', () => {
      const result = gridManager.createGrid(5, []);

      const dimensions = gridManager.getGridDimensions();

      expect(dimensions.startX).toBe(result.gridStartX);
      expect(dimensions.startY).toBe(result.gridStartY);
      expect(dimensions.cellSize).toBe(result.cellSize);
      expect(dimensions.gridSize).toBe(5);
    });

    it('should update after creating new grid', () => {
      gridManager.createGrid(3, []);
      const firstDimensions = gridManager.getGridDimensions();

      gridManager.createGrid(7, []);
      const secondDimensions = gridManager.getGridDimensions();

      expect(secondDimensions.gridSize).toBe(7);
      expect(secondDimensions.gridSize).not.toBe(firstDimensions.gridSize);
    });
  });

  describe('Grid Cell Styles', () => {
    it('should use correct fill color for default cells', () => {
      gridManager.createGrid(3, []);

      const createdCell = (mockScene.add.rectangle as any).mock.results[0].value;

      expect(createdCell.fillColor).toBe(0x444444);
    });

    it('should use correct stroke width for all cells', () => {
      gridManager.createGrid(3, []);

      const createdCell = (mockScene.add.rectangle as any).mock.results[0].value;

      expect(createdCell.strokeWidth).toBe(2);
    });

    it('should create blocked cells with blocked style', () => {
      const blockedCells = [{ row: 0, col: 0 }];
      gridManager.createGrid(3, blockedCells);

      const blockedCell = (mockScene.add.rectangle as any).mock.results[0].value;

      expect(blockedCell.fillColor).toBe(0x444444);
      expect(blockedCell.interactive).toBe(false);
    });
  });

  describe('Blocked Cell Handling', () => {
    it('should create sprites for blocked cells', () => {
      const blockedCells = [{ row: 1, col: 1 }];
      gridManager.createGrid(3, blockedCells);

      expect(mockScene.add.sprite).toHaveBeenCalledTimes(1);
      expect(mockScene.add.sprite).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'blocked-sprite'
      );
    });

    it('should scale blocked cell sprites to fit cell size', () => {
      const blockedCells = [{ row: 1, col: 1 }];
      const result = gridManager.createGrid(3, blockedCells);

      const sprite = (mockScene.add.sprite as any).mock.results[0].value;
      const expectedScale = (result.cellSize - 2) / sprite.width;

      expect(sprite.scaleX).toBe(expectedScale);
      expect(sprite.scaleY).toBe(expectedScale);
    });

    it('should disable interaction for blocked cells', () => {
      const blockedCells = [{ row: 1, col: 1 }];
      const result = gridManager.createGrid(3, blockedCells);

      const blockedCell = result.grid[1][1] as any;

      expect(blockedCell.interactive).toBe(false);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle very small grid (1x1)', () => {
      const result = gridManager.createGrid(1, []);

      expect(result.grid.length).toBe(1);
      expect(result.grid[0].length).toBe(1);
      expect(mockScene.add.rectangle).toHaveBeenCalledTimes(1);
    });

    it('should handle large grid (20x20)', () => {
      const result = gridManager.createGrid(20, []);

      expect(result.grid.length).toBe(20);
      expect(result.grid[0].length).toBe(20);
      expect(mockScene.add.rectangle).toHaveBeenCalledTimes(400);
    });

    it('should handle grid with all cells blocked', () => {
      const blockedCells = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ];
      gridManager.createGrid(2, blockedCells);

      expect(mockScene.add.sprite).toHaveBeenCalledTimes(4);
    });

    it('should handle recreating grid with different size', () => {
      const result1 = gridManager.createGrid(3, []);
      expect(result1.grid.length).toBe(3);

      const result2 = gridManager.createGrid(5, []);
      expect(result2.grid.length).toBe(5);
    });

    it('should handle recreating grid with different blocked cells', () => {
      gridManager.createGrid(3, [{ row: 0, col: 0 }]);
      expect(mockScene.add.sprite).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      gridManager.createGrid(3, [{ row: 1, col: 1 }, { row: 2, col: 2 }]);
      expect(mockScene.add.sprite).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cell Size Calculation', () => {
    it('should calculate cell size based on available space', () => {
      const result = gridManager.createGrid(10, []);

      // Available width = 800 * 0.9 = 720
      // Available height = 600 * 0.7 = 420
      // Max by width = 720 / 10 = 72
      // Max by height = 420 / 10 = 42
      // Should choose smaller: 42, but capped at 80 and min 40

      expect(result.cellSize).toBeGreaterThanOrEqual(40);
      expect(result.cellSize).toBeLessThanOrEqual(80);
    });

    it('should use MIN_CELL_SIZE for very large grids', () => {
      const result = gridManager.createGrid(100, []);

      expect(result.cellSize).toBe(40);
    });
  });
});
