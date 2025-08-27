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
        // For now, return a random valid move regardless of difficulty
        // This will be enhanced in subsequent phases
        const move = this.getRandomValidMove(gameState, gridSize);

        return move;
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
}
