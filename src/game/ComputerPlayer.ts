import { GameState } from './GameStateManager';

export class ComputerPlayer {
    private difficulty: string;
    private color: 'red' | 'blue';

    constructor(difficulty: string, color: 'red' | 'blue') {
        this.difficulty = difficulty;
        this.color = color;
    }

    /**
     * Find the next move for the computer player based on difficulty level
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns {row: number, col: number} - The chosen move coordinates
     */
    findMove(gameState: GameState[][], gridSize: number): { row: number, col: number } {
        switch (this.difficulty.toLowerCase()) {
            case 'easy':
                return this.getRandomValidMove(gameState, gridSize);
            case 'medium':
                return this.getMediumMove(gameState, gridSize);
            default:
                return this.getRandomValidMove(gameState, gridSize);
        }
    }

    /**
     * Get a random valid move from the available moves
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns A random valid move coordinate
     */
    private getRandomValidMove(gameState: GameState[][], gridSize: number): { row: number, col: number } {
        const validMoves = this.getValidMoves(gameState, gridSize);
        
        if (validMoves.length === 0) {
            throw new Error('No valid moves available');
        }

        const randomIndex = Math.floor(Math.random() * validMoves.length);
        return validMoves[randomIndex];
    }

    /**
     * Get all valid moves for the current player
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns Array of valid move coordinates
     */
    private getValidMoves(gameState: GameState[][], gridSize: number): { row: number, col: number }[] {
        const validMoves: { row: number, col: number }[] = [];

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cell = gameState[row][col];
                
                // A move is valid if the cell is empty or owned by this player
                if (cell.dotCount === 0 || cell.owner === this.color) {
                    validMoves.push({ row, col });
                }
            }
        }

        return validMoves;
    }

    /**
     * Get the difficulty level of this computer player
     */
    getDifficulty(): string {
        return this.difficulty;
    }

    /**
     * Get the color of this computer player
     */
    getColor(): 'red' | 'blue' {
        return this.color;
    }

    /**
     * Set a new difficulty level for this computer player
     */
    setDifficulty(difficulty: string): void {
        this.difficulty = difficulty;
    }

    /**
     * Get a move using Medium AI strategy
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns The chosen move coordinate
     */
    private getMediumMove(gameState: GameState[][], gridSize: number): { row: number, col: number } {
        // 1. Look for a fully loaded cell (owned by this player)
        const fullyLoadedCell = this.findFullyLoadedCell(gameState, gridSize);
        if (fullyLoadedCell) {
            return fullyLoadedCell;
        }

        // 2. Look for a low capacity free cell (corner or edge cell)
        const lowCapacityCell = this.findLowCapacityFreeCell(gameState, gridSize);
        if (lowCapacityCell) {
            return lowCapacityCell;
        }

        // 3. Fall back to random valid move
        return this.getRandomValidMove(gameState, gridSize);
    }

    /**
     * Find a fully loaded cell owned by this player
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns Coordinate of fully loaded cell or null
     */
    private findFullyLoadedCell(gameState: GameState[][], gridSize: number): { row: number, col: number } | null {
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cell = gameState[row][col];
                if (cell.owner === this.color && cell.dotCount === cell.capacity) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    /**
     * Find a low capacity free cell (corner or edge cells)
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns Coordinate of low capacity free cell or null
     */
    private findLowCapacityFreeCell(gameState: GameState[][], gridSize: number): { row: number, col: number } | null {
        const lowCapacityCells: { row: number, col: number }[] = [];

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cell = gameState[row][col];
                
                // Only consider empty cells
                if (cell.dotCount === 0) {
                    // Corner cells have capacity 2, edge cells have capacity 3
                    if (cell.capacity <= 3) {
                        lowCapacityCells.push({ row, col });
                    }
                }
            }
        }

        if (lowCapacityCells.length > 0) {
            // Prefer corner cells (capacity 2) over edge cells (capacity 3)
            const cornerCells = lowCapacityCells.filter(pos => gameState[pos.row][pos.col].capacity === 2);
            if (cornerCells.length > 0) {
                const randomIndex = Math.floor(Math.random() * cornerCells.length);
                return cornerCells[randomIndex];
            }
            
            // If no corner cells, pick a random edge cell
            const randomIndex = Math.floor(Math.random() * lowCapacityCells.length);
            return lowCapacityCells[randomIndex];
        }

        return null;
    }
}
