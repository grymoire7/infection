import { DotPositioner } from './utils/DotPositioner';

type PlayerColor = 'red' | 'blue';

/**
 * Manages all visual dot sprite creation, positioning, and lifecycle.
 * Encapsulates the visual representation of dots on the game board,
 * separating rendering concerns from game logic.
 */
export class VisualDotManager {
    private scene: Phaser.Scene;
    private dots: Phaser.GameObjects.Sprite[][][]; // 3D array: [row][col][dotIndex]
    private gridSize: number;

    constructor(scene: Phaser.Scene, gridSize: number) {
        this.scene = scene;
        this.gridSize = gridSize;
        this.initializeDotArrays();
    }

    /**
     * Initialize the 3D array structure for storing dot sprites
     */
    private initializeDotArrays(): void {
        this.dots = Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill(null).map(() => [])
        );
    }

    /**
     * Add a single visual dot sprite to a cell
     */
    addDot(row: number, col: number, owner: PlayerColor): void {
        const spriteKey = owner === 'red' ? 'evil-sprite' : 'good-sprite';
        const animationKey = owner === 'red' ? 'evil-dot-pulse' : 'good-dot-pulse';

        const dot = this.scene.add.sprite(0, 0, spriteKey);
        dot.setScale(1.5);

        // Randomly flip for visual variety
        if (Math.random() < 0.5) {
            dot.toggleFlipX();
        }

        dot.play(animationKey);
        this.dots[row][col].push(dot);
    }

    /**
     * Clear all dots from a specific cell
     */
    clearCell(row: number, col: number): void {
        const cellDots = this.dots[row][col];
        while (cellDots.length > 0) {
            const dotToRemove = cellDots.pop();
            if (dotToRemove) {
                dotToRemove.destroy();
            }
        }
    }

    /**
     * Update a cell's visual dots to match the given count and owner
     */
    updateCell(row: number, col: number, owner: PlayerColor | 'default' | 'blocked', dotCount: number, cellCenterX: number, cellCenterY: number): void {
        // Clear existing dots
        this.clearCell(row, col);

        // Only recreate dots if there are any and the cell is owned by a player
        if (dotCount > 0 && (owner === 'red' || owner === 'blue')) {
            for (let i = 0; i < dotCount; i++) {
                this.addDot(row, col, owner);
            }
            this.arrangeDots(row, col, cellCenterX, cellCenterY);
        }
    }

    /**
     * Arrange dots within a cell using optimal positioning
     */
    arrangeDots(row: number, col: number, cellCenterX: number, cellCenterY: number): void {
        const cellDots = this.dots[row][col];
        if (cellDots.length === 0) return;

        const positions = DotPositioner.calculateDotPositions(
            cellDots.length,
            cellCenterX,
            cellCenterY
        );

        for (let i = 0; i < positions.length; i++) {
            cellDots[i].setPosition(positions[i].x, positions[i].y);
        }
    }

    /**
     * Clear all dots from the entire board
     */
    clearAll(): void {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.clearCell(row, col);
            }
        }
    }

    /**
     * Recreate all dots on the board based on provided board state
     */
    recreateAll(
        boardState: { owner: PlayerColor | 'default' | 'blocked'; dotCount: number }[][],
        getCellCenter: (row: number, col: number) => { x: number; y: number }
    ): void {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellState = boardState[row][col];
                const cellCenter = getCellCenter(row, col);

                this.updateCell(
                    row,
                    col,
                    cellState.owner,
                    cellState.dotCount,
                    cellCenter.x,
                    cellCenter.y
                );
            }
        }
    }

    /**
     * Get the current grid size
     */
    getGridSize(): number {
        return this.gridSize;
    }
}
