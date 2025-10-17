import { CellState } from './GameStateManager';

export class GridManager {
    private static readonly MAX_CELL_SIZE = 80;
    private static readonly MIN_CELL_SIZE = 40;
    private static readonly CELL_STYLES = {
        default: { fillColor: 0x444444, strokeColor: 0x666666, hoverFillColor: 0x555555, hoverStrokeColor: 0x888888 },
        red:     { fillColor: 0x664444, strokeColor: 0x888888, hoverFillColor: 0x885555, hoverStrokeColor: 0x888888 },
        blue:    { fillColor: 0x444466, strokeColor: 0x888888, hoverFillColor: 0x555588, hoverStrokeColor: 0x888888 },
        blocked: { fillColor: 0x444444, strokeColor: 0x999999, hoverFillColor: 0x444444, hoverStrokeColor: 0x999999 }
    };

    private scene: Phaser.Scene;
    private gridSize: number;
    private cellSize: number;
    private gridStartX: number;
    private gridStartY: number;
    private grid: Phaser.GameObjects.Rectangle[][];
    private blockedCells: { row: number; col: number }[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    createGrid(gridSize: number, blockedCells: { row: number; col: number }[] = []): {
        grid: Phaser.GameObjects.Rectangle[][],
        gridStartX: number,
        gridStartY: number,
        cellSize: number
    } {
        this.gridSize = gridSize;
        this.blockedCells = blockedCells;
        
        this.calculateGridDimensions();
        this.initializeGridArrays();
        this.createGridCells();

        return {
            grid: this.grid,
            gridStartX: this.gridStartX,
            gridStartY: this.gridStartY,
            cellSize: this.cellSize
        };
    }

    private calculateGridDimensions(): void {
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        
        // Reserve space for UI elements (title, player indicator, instructions)
        const availableWidth = screenWidth * 0.9;
        const availableHeight = screenHeight * 0.7;
        
        // Calculate cell size that fits within available space
        const maxCellSizeByWidth = Math.floor(availableWidth / this.gridSize);
        const maxCellSizeByHeight = Math.floor(availableHeight / this.gridSize);
        this.cellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight, GridManager.MAX_CELL_SIZE);
        
        // Ensure minimum cell size for playability
        this.cellSize = Math.max(this.cellSize, GridManager.MIN_CELL_SIZE);
        
        // Calculate centered grid position
        const totalGridWidth = this.gridSize * this.cellSize;
        const totalGridHeight = this.gridSize * this.cellSize;
        this.gridStartX = (screenWidth - totalGridWidth) / 2 + this.cellSize / 2;
        this.gridStartY = (screenHeight - totalGridHeight) / 2 + this.cellSize / 2 + 60;
    }

    private initializeGridArrays(): void {
        this.grid = Array(this.gridSize).fill(null).map(() => []);
    }

    private createGridCells(): void {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const x = this.gridStartX + col * this.cellSize;
                const y = this.gridStartY + row * this.cellSize;
                const isBlocked = this.isCellBlocked(row, col);
                this.createCellVisual(row, col, x, y, isBlocked);
            }
        }
    }

    private isCellBlocked(row: number, col: number): boolean {
        return this.blockedCells.some(cell => cell.row === row && cell.col === col);
    }

    private createCellVisual(row: number, col: number, x: number, y: number, isBlocked: boolean): void {
        const cellStyle = isBlocked ? GridManager.CELL_STYLES.blocked : GridManager.CELL_STYLES.default;

        const cell = this.scene.add.rectangle(x, y, this.cellSize - 2, this.cellSize - 2, cellStyle.fillColor);
        cell.setStrokeStyle(2, cellStyle.strokeColor);
        
        if (isBlocked) {
            const wall = this.scene.add.sprite(x + 2, y + 2, 'blocked-sprite');                                                                                 
            const scaleFactor = (this.cellSize - 2) / wall.width;
            wall.setScale(scaleFactor);
            if (Math.random() < 0.5) {
                wall.toggleFlipX(); // Randomly flip for variety
            }
            wall.play('blocked-pulse');

            cell.disableInteractive();
        }

        this.grid[row][col] = cell;
    }

    makeCellInteractive(row: number, col: number, onHover: () => void, onOut: () => void, onClick: () => void): void {
        const cell = this.grid[row][col];
        // Only make cell interactive if it exists and is not blocked
        if (cell && !this.isCellBlocked(row, col)) {
            cell.setInteractive();
            cell.on('pointerover', onHover);
            cell.on('pointerout', onOut);
            cell.on('pointerdown', onClick);
        }
    }

    updateCellOwnership(row: number, col: number, cellState: CellState): void {
        const cell = this.grid[row][col];
        if (!cell) return;

        const cellStyle = GridManager.CELL_STYLES[cellState.owner || 'default'];
        cell.setFillStyle(cellStyle.fillColor);
        cell.setStrokeStyle(2, cellStyle.strokeColor);
    }

    handleCellHover(row: number, col: number, cellState: CellState): void {
        const cell = this.grid[row][col];
        // Early return for blocked cells or if cell doesn't exist
        if (!cell || cellState.isBlocked || this.isCellBlocked(row, col)) return;

        const cellStyle = cellState.owner ? GridManager.CELL_STYLES[cellState.owner] : GridManager.CELL_STYLES.default;
        cell.setFillStyle(cellStyle.hoverFillColor);
        cell.setStrokeStyle(2, cellStyle.hoverStrokeColor);
    }

    calculateCellCapacity(row: number, col: number, boardState: CellState[][]): number {
        let capacity = 0;

        // Check all four orthogonal directions
        const directions = [
            [-1, 0], // up
            [1, 0],  // down
            [0, -1], // left
            [0, 1]   // right
        ];

        for (const [deltaRow, deltaCol] of directions) {
            const newRow = row + deltaRow;
            const newCol = col + deltaCol;

            // Check if the adjacent cell is within grid bounds
            if (newRow >= 0 && newRow < this.gridSize &&
                newCol >= 0 && newCol < this.gridSize) {
                // Make sure the cell exists in boardState
                if (boardState[newRow] && boardState[newRow][newCol]) {
                    const adjacentCell = boardState[newRow][newCol];
                    // Only count non-blocked adjacent cells
                    if (!adjacentCell.isBlocked) {
                        capacity++;
                    }
                }
            }
        }

        return capacity;
    }

    /**
     * Get the center coordinates of a cell
     */
    getCellCenter(row: number, col: number): { x: number; y: number } {
        return {
            x: this.gridStartX + col * this.cellSize,
            y: this.gridStartY + row * this.cellSize
        };
    }

    /**
     * Get the current grid dimensions
     */
    getGridDimensions(): { startX: number; startY: number; cellSize: number; gridSize: number } {
        return {
            startX: this.gridStartX,
            startY: this.gridStartY,
            cellSize: this.cellSize,
            gridSize: this.gridSize
        };
    }
}
