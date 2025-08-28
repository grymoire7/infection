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
            case 'hard':
                return this.getHardMove(gameState, gridSize);
            case 'expert':
                return this.getExpertMove(gameState, gridSize);
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
                
                // A move is valid if the cell is not blocked and (empty or owned by this player)
                if (!cell.isBlocked && (cell.dotCount === 0 || cell.owner === this.color)) {
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

    /**
     * Get a move using Hard AI strategy
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns The chosen move coordinate
     */
    private getHardMove(gameState: GameState[][], gridSize: number): { row: number, col: number } {
        // 1. Look for a full cell next to an opponent's full cell
        const fullCellNextToOpponentFull = this.findFullCellNextToOpponentFull(gameState, gridSize);
        if (fullCellNextToOpponentFull) {
            return fullCellNextToOpponentFull;
        }

        // 2. Look for a fully loaded cell next to an opponent's cell
        const fullCellNextToOpponent = this.findFullCellNextToOpponent(gameState, gridSize);
        if (fullCellNextToOpponent) {
            return fullCellNextToOpponent;
        }

        // 3. Look for any fully loaded cell (owned by this player)
        const fullyLoadedCell = this.findFullyLoadedCell(gameState, gridSize);
        if (fullyLoadedCell) {
            return fullyLoadedCell;
        }

        // 4. Look for a low capacity free cell (corner or edge cell)
        const lowCapacityCell = this.findLowCapacityFreeCell(gameState, gridSize);
        if (lowCapacityCell) {
            return lowCapacityCell;
        }

        // 5. Fall back to random valid move
        return this.getRandomValidMove(gameState, gridSize);
    }

    /**
     * Find a full cell owned by this player that is next to an opponent's full cell
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns Coordinate of full cell next to opponent's full cell or null
     */
    private findFullCellNextToOpponentFull(gameState: GameState[][], gridSize: number): { row: number, col: number } | null {
        const opponentColor = this.color === 'red' ? 'blue' : 'red';

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cell = gameState[row][col];
                
                // Check if this is our full cell
                if (cell.owner === this.color && cell.dotCount === cell.capacity) {
                    // Check if any adjacent cell is an opponent's full cell
                    if (this.hasAdjacentOpponentFullCell(gameState, gridSize, row, col, opponentColor)) {
                        return { row, col };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Find a fully loaded cell owned by this player that is next to any opponent's cell
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns Coordinate of full cell next to opponent cell or null
     */
    private findFullCellNextToOpponent(gameState: GameState[][], gridSize: number): { row: number, col: number } | null {
        const opponentColor = this.color === 'red' ? 'blue' : 'red';

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cell = gameState[row][col];
                
                // Check if this is our full cell
                if (cell.owner === this.color && cell.dotCount === cell.capacity) {
                    // Check if any adjacent cell is owned by opponent
                    if (this.hasAdjacentOpponentCell(gameState, gridSize, row, col, opponentColor)) {
                        return { row, col };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Check if a cell has an adjacent opponent's full cell
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @param row - Row of the cell to check
     * @param col - Column of the cell to check
     * @param opponentColor - Color of the opponent
     * @returns True if there's an adjacent opponent's full cell
     */
    private hasAdjacentOpponentFullCell(gameState: GameState[][], gridSize: number, row: number, col: number, opponentColor: string): boolean {
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
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                const adjacentCell = gameState[newRow][newCol];
                
                // Check if it's an opponent's full cell
                if (adjacentCell.owner === opponentColor && adjacentCell.dotCount === adjacentCell.capacity) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if a cell has an adjacent opponent's cell
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @param row - Row of the cell to check
     * @param col - Column of the cell to check
     * @param opponentColor - Color of the opponent
     * @returns True if there's an adjacent opponent's cell
     */
    private hasAdjacentOpponentCell(gameState: GameState[][], gridSize: number, row: number, col: number, opponentColor: string): boolean {
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
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                const adjacentCell = gameState[newRow][newCol];
                
                // Check if it's owned by opponent
                if (adjacentCell.owner === opponentColor) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get a move using Expert AI strategy
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns The chosen move coordinate
     */
    private getExpertMove(gameState: GameState[][], gridSize: number): { row: number, col: number } {
        // 1. Look for a full cell next to an opponent's full cell
        const fullCellNextToOpponentFull = this.findFullCellNextToOpponentFull(gameState, gridSize);
        if (fullCellNextToOpponentFull) {
            return fullCellNextToOpponentFull;
        }

        // 2. Look for a fully loaded cell next to an opponent's cell
        const fullCellNextToOpponent = this.findFullCellNextToOpponent(gameState, gridSize);
        if (fullCellNextToOpponent) {
            return fullCellNextToOpponent;
        }

        // 3. Look for any fully loaded cell (owned by this player)
        const fullyLoadedCell = this.findFullyLoadedCell(gameState, gridSize);
        if (fullyLoadedCell) {
            return fullyLoadedCell;
        }

        // 4. Look for an advantage cell
        const advantageCell = this.findAdvantageCell(gameState, gridSize);
        if (advantageCell) {
            return advantageCell;
        }

        // 5. Look for a low capacity free cell (corner or edge cell)
        const lowCapacityCell = this.findLowCapacityFreeCell(gameState, gridSize);
        if (lowCapacityCell) {
            return lowCapacityCell;
        }

        // 6. Fall back to random valid move
        return this.getRandomValidMove(gameState, gridSize);
    }

    /**
     * Find an advantage cell - a cell owned by this player that has ullage equal to or less than all adjacent opponent cells
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @returns Coordinate of advantage cell or null
     */
    private findAdvantageCell(gameState: GameState[][], gridSize: number): { row: number, col: number } | null {
        const opponentColor = this.color === 'red' ? 'blue' : 'red';

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cell = gameState[row][col];
                
                // Only consider cells owned by this player
                if (cell.owner === this.color) {
                    const cellUllage = cell.capacity - cell.dotCount;
                    
                    // Check if this cell has advantage over adjacent opponent cells
                    if (this.hasAdvantageOverAdjacentOpponents(gameState, gridSize, row, col, cellUllage, opponentColor)) {
                        return { row, col };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Check if a cell has advantage over all adjacent opponent cells
     * @param gameState - Current state of the game board
     * @param gridSize - Size of the game grid
     * @param row - Row of the cell to check
     * @param col - Column of the cell to check
     * @param cellUllage - Ullage of the cell to check
     * @param opponentColor - Color of the opponent
     * @returns True if this cell has advantage over all adjacent opponent cells
     */
    private hasAdvantageOverAdjacentOpponents(gameState: GameState[][], gridSize: number, row: number, col: number, cellUllage: number, opponentColor: string): boolean {
        const directions = [
            [-1, 0], // up
            [1, 0],  // down
            [0, -1], // left
            [0, 1]   // right
        ];

        let hasAdjacentOpponent = false;

        for (const [deltaRow, deltaCol] of directions) {
            const newRow = row + deltaRow;
            const newCol = col + deltaCol;

            // Check if the adjacent cell is within grid bounds
            if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
                const adjacentCell = gameState[newRow][newCol];
                
                // If it's an opponent's cell or empty cell
                if (adjacentCell.owner === opponentColor || adjacentCell.owner === null) {
                    hasAdjacentOpponent = true;
                    const adjacentUllage = adjacentCell.capacity - adjacentCell.dotCount;
                    
                    // If our ullage is greater than the adjacent cell's ullage, we don't have advantage
                    if (cellUllage > adjacentUllage) {
                        return false;
                    }
                }
            }
        }

        // Only return true if we found at least one adjacent opponent/empty cell and have advantage over all
        return hasAdjacentOpponent;
    }
}
