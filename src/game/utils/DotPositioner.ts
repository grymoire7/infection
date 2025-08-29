export class DotPositioner {
    private static readonly MAX_VISUAL_DOTS = 6;
    private static readonly DOT_SPACING = 15;
    private static readonly DOT_OFFSET = 12;
    private static readonly DOT_LARGE_OFFSET = 18;

    /**
     * Calculate positions for dots within a cell based on count
     */
    static calculateDotPositions(count: number, centerX: number, centerY: number): { x: number, y: number }[] {
        const positions: { x: number, y: number }[] = [];

        switch (count) {
            case 1:
                positions.push({ x: centerX, y: centerY });
                break;
            case 2:
                positions.push(
                    { x: centerX - DotPositioner.DOT_SPACING, y: centerY },
                    { x: centerX + DotPositioner.DOT_SPACING, y: centerY }
                );
                break;
            case 3:
                positions.push(
                    { x: centerX, y: centerY - DotPositioner.DOT_OFFSET },
                    { x: centerX - DotPositioner.DOT_OFFSET, y: centerY + DotPositioner.DOT_OFFSET / 1.5 },
                    { x: centerX + DotPositioner.DOT_OFFSET, y: centerY + DotPositioner.DOT_OFFSET / 1.5 }
                );
                break;
            case 4:
                positions.push(
                    { x: centerX - DotPositioner.DOT_OFFSET, y: centerY - DotPositioner.DOT_OFFSET },
                    { x: centerX + DotPositioner.DOT_OFFSET, y: centerY - DotPositioner.DOT_OFFSET },
                    { x: centerX - DotPositioner.DOT_OFFSET, y: centerY + DotPositioner.DOT_OFFSET },
                    { x: centerX + DotPositioner.DOT_OFFSET, y: centerY + DotPositioner.DOT_OFFSET }
                );
                break;
            case 5:
                positions.push(
                    { x: centerX, y: centerY },
                    { x: centerX - DotPositioner.DOT_LARGE_OFFSET, y: centerY - DotPositioner.DOT_LARGE_OFFSET },
                    { x: centerX + DotPositioner.DOT_LARGE_OFFSET, y: centerY - DotPositioner.DOT_LARGE_OFFSET },
                    { x: centerX - DotPositioner.DOT_LARGE_OFFSET, y: centerY + DotPositioner.DOT_LARGE_OFFSET },
                    { x: centerX + DotPositioner.DOT_LARGE_OFFSET, y: centerY + DotPositioner.DOT_LARGE_OFFSET }
                );
                break;
            case 6:
                positions.push(
                    { x: centerX - DotPositioner.DOT_LARGE_OFFSET, y: centerY - DotPositioner.DOT_OFFSET },
                    { x: centerX, y: centerY - DotPositioner.DOT_OFFSET },
                    { x: centerX + DotPositioner.DOT_LARGE_OFFSET, y: centerY - DotPositioner.DOT_OFFSET },
                    { x: centerX - DotPositioner.DOT_LARGE_OFFSET, y: centerY + DotPositioner.DOT_OFFSET },
                    { x: centerX, y: centerY + DotPositioner.DOT_OFFSET },
                    { x: centerX + DotPositioner.DOT_LARGE_OFFSET, y: centerY + DotPositioner.DOT_OFFSET }
                );
                break;
        }

        return positions;
    }

    /**
     * Get the maximum number of visual dots to display
     */
    static getMaxVisualDots(): number {
        return DotPositioner.MAX_VISUAL_DOTS;
    }
}
