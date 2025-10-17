import { CellState } from './GameStateManager';

type PlayerColor = 'red' | 'blue';
type CellOwner = PlayerColor | 'default' | 'blocked';

export interface GameMove {
    row: number;
    col: number;
}

/**
 * Manages the game board state and provides controlled access to board mutations.
 * Encapsulates all logic related to board state, cell ownership, and win conditions.
 * This separates the model (board state) from the view (Game scene) and controller logic.
 */
export class BoardStateManager {
    private boardState: CellState[][];
    private gridSize: number;
    private blockedCells: { row: number; col: number }[];

    constructor(gridSize: number, blockedCells: { row: number; col: number }[] = []) {
        this.gridSize = gridSize;
        this.blockedCells = blockedCells;
        this.boardState = this.initializeBoard();
    }

    /**
     * Initialize a new board with empty cells
     */
    private initializeBoard(): CellState[][] {
        const board: CellState[][] = Array(this.gridSize);

        for (let row = 0; row < this.gridSize; row++) {
            board[row] = Array(this.gridSize);
            for (let col = 0; col < this.gridSize; col++) {
                const isBlocked = this.isCellBlocked(row, col);
                const owner: CellOwner = isBlocked ? 'blocked' : 'default';

                board[row][col] = {
                    dotCount: 0,
                    owner: owner,
                    capacity: 0, // Will be calculated later
                    isBlocked: isBlocked
                };
            }
        }

        return board;
    }

    /**
     * Check if a cell is blocked
     */
    private isCellBlocked(row: number, col: number): boolean {
        return this.blockedCells.some(cell => cell.row === row && cell.col === col);
    }

    /**
     * Get the entire board state (read-only access)
     */
    getState(): CellState[][] {
        return this.boardState;
    }

    /**
     * Get a specific cell's state
     */
    getCellState(row: number, col: number): CellState {
        return this.boardState[row][col];
    }

    /**
     * Set a cell's capacity (should be done during initialization)
     */
    setCellCapacity(row: number, col: number, capacity: number): void {
        this.boardState[row][col].capacity = capacity;
    }

    /**
     * Place a dot in a cell
     */
    placeDot(row: number, col: number, owner: PlayerColor): void {
        const cell = this.boardState[row][col];
        cell.dotCount++;
        cell.owner = owner;
    }

    /**
     * Check if a move is valid
     */
    isValidMove(row: number, col: number, player: PlayerColor): boolean {
        // Check bounds
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
            return false;
        }

        const cell = this.boardState[row][col];

        // Cannot place on blocked cells
        if (cell.isBlocked) {
            return false;
        }

        // Can only place on empty cells or cells you already own
        return cell.dotCount === 0 || cell.owner === player;
    }

    /**
     * Check if a cell should explode
     */
    shouldExplode(row: number, col: number): boolean {
        const cell = this.boardState[row][col];
        return cell.dotCount > cell.capacity;
    }

    /**
     * Explode a cell and return affected cells
     */
    explodeCell(row: number, col: number): GameMove[] {
        const cell = this.boardState[row][col];
        const explodingPlayer = cell.owner as PlayerColor;
        const affectedCells: GameMove[] = [];

        // Remove dots equal to capacity
        const dotsToDistribute = cell.capacity;
        cell.dotCount -= dotsToDistribute;

        // Distribute to adjacent cells
        const directions = [
            [-1, 0], // up
            [1, 0],  // down
            [0, -1], // left
            [0, 1]   // right
        ];

        for (const [deltaRow, deltaCol] of directions) {
            const targetRow = row + deltaRow;
            const targetCol = col + deltaCol;

            if (this.isValidAdjacentCell(targetRow, targetCol)) {
                const adjacentCell = this.boardState[targetRow][targetCol];
                adjacentCell.dotCount++;
                adjacentCell.owner = explodingPlayer;
                affectedCells.push({ row: targetRow, col: targetCol });
            }
        }

        return affectedCells;
    }

    /**
     * Check if a cell is a valid adjacent target (within bounds and not blocked)
     */
    private isValidAdjacentCell(row: number, col: number): boolean {
        return row >= 0 && row < this.gridSize &&
               col >= 0 && col < this.gridSize &&
               !this.boardState[row][col].isBlocked;
    }

    /**
     * Get all valid moves for a player
     */
    getValidMoves(player: PlayerColor): GameMove[] {
        const validMoves: GameMove[] = [];

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.isValidMove(row, col, player)) {
                    validMoves.push({ row, col });
                }
            }
        }

        return validMoves;
    }

    /**
     * Check win condition and return winner if any
     */
    checkWinCondition(): PlayerColor | null {
        const counts = this.countCellsByOwner();

        // Game is won when there are no empty cells and one player owns all cells
        if (counts.empty === 0) {
            if (counts.red > 0 && counts.blue === 0) {
                return 'red';
            } else if (counts.blue > 0 && counts.red === 0) {
                return 'blue';
            }
        }

        return null;
    }

    /**
     * Count cells by owner
     */
    private countCellsByOwner(): { red: number; blue: number; empty: number } {
        let redCells = 0;
        let blueCells = 0;
        let emptyCells = 0;

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.boardState[row][col];

                if (cell.isBlocked) {
                    continue;
                }

                if (cell.owner === 'red') {
                    redCells++;
                } else if (cell.owner === 'blue') {
                    blueCells++;
                } else {
                    emptyCells++;
                }
            }
        }

        return { red: redCells, blue: blueCells, empty: emptyCells };
    }

    /**
     * Replace the entire board state (used for undo/load operations)
     */
    setState(newState: CellState[][]): void {
        this.boardState = newState;
    }

    /**
     * Get the grid size
     */
    getGridSize(): number {
        return this.gridSize;
    }

    /**
     * Get all cells that should explode
     */
    getCellsToExplode(): GameMove[] {
        const cellsToExplode: GameMove[] = [];

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.shouldExplode(row, col)) {
                    cellsToExplode.push({ row, col });
                }
            }
        }

        return cellsToExplode;
    }
}
