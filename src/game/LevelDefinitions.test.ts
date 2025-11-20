import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    LEVELS,
    DEBUG_LEVEL_SET,
    BASIC_LEVEL_SET,
    ADVANCED_LEVEL_SET,
    EPIDEMIC_LEVEL_SET,
    LEVEL_SETS,
    getLevelById,
    getLevelsForSet,
    getAIDifficultyForLevel
} from './LevelDefinitions';

describe('LevelDefinitions', () => {
    describe('LEVELS structure validation', () => {
        it('should have valid structure for all levels', () => {
            Object.values(LEVELS).forEach(level => {
                // Required properties
                expect(level).toHaveProperty('id');
                expect(level).toHaveProperty('name');
                expect(level).toHaveProperty('description');
                expect(level).toHaveProperty('gridSize');
                expect(level).toHaveProperty('blockedCells');

                // Type validation
                expect(typeof level.id).toBe('string');
                expect(typeof level.name).toBe('string');
                expect(typeof level.description).toBe('string');
                expect(typeof level.gridSize).toBe('number');
                expect(Array.isArray(level.blockedCells)).toBe(true);

                // Value validation
                expect(level.gridSize).toBeGreaterThan(0);
                expect(Number.isInteger(level.gridSize)).toBe(true);

                // Blocked cell validation
                level.blockedCells.forEach(cell => {
                    expect(cell).toHaveProperty('row');
                    expect(cell).toHaveProperty('col');
                    expect(typeof cell.row).toBe('number');
                    expect(typeof cell.col).toBe('number');
                    expect(Number.isInteger(cell.row)).toBe(true);
                    expect(Number.isInteger(cell.col)).toBe(true);
                    expect(cell.row).toBeGreaterThanOrEqual(0);
                    expect(cell.row).toBeLessThan(level.gridSize);
                    expect(cell.col).toBeGreaterThanOrEqual(0);
                    expect(cell.col).toBeLessThan(level.gridSize);
                });

                // ID should match the pattern
                expect(level.id).toMatch(/^level-s\d+-b/);
            });
        });

        it('should have unique level IDs', () => {
            const levelIds = Object.keys(LEVELS);
            const uniqueIds = [...new Set(levelIds)];
            expect(levelIds).toHaveLength(uniqueIds.length);
        });

        it('should ensure all level IDs exist in LEVELS object', () => {
            Object.values(LEVELS).forEach(level => {
                expect(LEVELS[level.id]).toBeDefined();
                expect(LEVELS[level.id]).toBe(level);
            });
        });
    });

    describe('Level Set structure validation', () => {
        const allLevelSets = [DEBUG_LEVEL_SET, BASIC_LEVEL_SET, ADVANCED_LEVEL_SET, EPIDEMIC_LEVEL_SET];

        it('should have valid structure for all level sets', () => {
            allLevelSets.forEach(levelSet => {
                // Required properties
                expect(levelSet).toHaveProperty('id');
                expect(levelSet).toHaveProperty('name');
                expect(levelSet).toHaveProperty('description');
                expect(levelSet).toHaveProperty('levelEntries');

                // Type validation
                expect(typeof levelSet.id).toBe('string');
                expect(typeof levelSet.name).toBe('string');
                expect(typeof levelSet.description).toBe('string');
                expect(Array.isArray(levelSet.levelEntries)).toBe(true);

                // Level entries validation
                levelSet.levelEntries.forEach(entry => {
                    expect(entry).toHaveProperty('levelId');
                    expect(entry).toHaveProperty('aiDifficulty');
                    expect(typeof entry.levelId).toBe('string');
                    expect(['easy', 'medium', 'hard', 'expert']).toContain(entry.aiDifficulty);
                });
            });
        });

        it('should have unique level set IDs', () => {
            const levelSetIds = allLevelSets.map(set => set.id);
            const uniqueIds = [...new Set(levelSetIds)];
            expect(levelSetIds).toHaveLength(uniqueIds.length);
        });

        it('should ensure all level entries reference existing levels', () => {
            allLevelSets.forEach(levelSet => {
                levelSet.levelEntries.forEach(entry => {
                    const level = getLevelById(entry.levelId);
                    expect(level).toBeDefined();
                    expect(level?.id).toBe(entry.levelId);
                });
            });
        });
    });

    describe('LEVEL_SETS conditional inclusion', () => {
        it('should include DEBUG_LEVEL_SET in test environment', () => {
            const debugLevelSet = LEVEL_SETS.find(set => set.id === 'debug');
            expect(debugLevelSet).toBeDefined();
            expect(debugLevelSet).toBe(DEBUG_LEVEL_SET);
        });

        it('should include all non-debug level sets', () => {
            const nonDebugSets = LEVEL_SETS.filter(set => set.id !== 'debug');
            const expectedNonDebugSets = [BASIC_LEVEL_SET, ADVANCED_LEVEL_SET, EPIDEMIC_LEVEL_SET];

            expect(nonDebugSets).toHaveLength(expectedNonDebugSets.length);
            expectedNonDebugSets.forEach(expectedSet => {
                expect(nonDebugSets).toContainEqual(expectedSet);
            });
        });

        it('should have no duplicate level set IDs in LEVEL_SETS', () => {
            const levelSetIds = LEVEL_SETS.map(set => set.id);
            const uniqueIds = [...new Set(levelSetIds)];
            expect(levelSetIds).toHaveLength(uniqueIds.length);
        });
    });

    describe('Helper function validation', () => {
        describe('getLevelById', () => {
            it('should return correct level for existing IDs', () => {
                Object.values(LEVELS).forEach(expectedLevel => {
                    const level = getLevelById(expectedLevel.id);
                    expect(level).toBeDefined();
                    expect(level).toBe(expectedLevel);
                });
            });

            it('should return undefined for non-existent ID', () => {
                const level = getLevelById('non-existent-level-id');
                expect(level).toBeUndefined();
            });
        });

        describe('getLevelsForSet', () => {
            it('should return correct levels for all level sets', () => {
                [DEBUG_LEVEL_SET, BASIC_LEVEL_SET, ADVANCED_LEVEL_SET, EPIDEMIC_LEVEL_SET].forEach(levelSet => {
                    const levels = getLevelsForSet(levelSet);
                    expect(levels).toHaveLength(levelSet.levelEntries.length);

                    const levelIds = levels.map(level => level.id);
                    const expectedLevelIds = levelSet.levelEntries.map(entry => entry.levelId);
                    expect(levelIds.sort()).toEqual(expectedLevelIds.sort());
                });
            });

            it('should handle level set with invalid level entries gracefully', () => {
                const invalidSet = {
                    id: 'invalid-test',
                    name: 'Invalid Test Set',
                    description: 'Test set with invalid levels',
                    levelEntries: [
                        { levelId: 'non-existent-level-1', aiDifficulty: 'easy' },
                        { levelId: 'non-existent-level-2', aiDifficulty: 'medium' }
                    ]
                };

                const levels = getLevelsForSet(invalidSet);
                expect(levels).toHaveLength(0);
            });
        });

        describe('getAIDifficultyForLevel', () => {
            it('should return correct AI difficulty for valid combinations', () => {
                [DEBUG_LEVEL_SET, BASIC_LEVEL_SET, ADVANCED_LEVEL_SET, EPIDEMIC_LEVEL_SET].forEach(levelSet => {
                    levelSet.levelEntries.forEach(entry => {
                        const difficulty = getAIDifficultyForLevel(levelSet.id, entry.levelId);
                        expect(difficulty).toBe(entry.aiDifficulty);
                    });
                });
            });

            it('should return easy for non-existent level set', () => {
                const difficulty = getAIDifficultyForLevel('non-existent-level-set', 'level-s3-bx');
                expect(difficulty).toBe('easy');
            });

            it('should return easy for non-existent level in valid set', () => {
                const difficulty = getAIDifficultyForLevel('debug', 'non-existent-level');
                expect(difficulty).toBe('easy');
            });
        });
    });

    describe('Level connectivity validation', () => {
        it('should ensure all levels have proper orthogonal connectivity', () => {
            Object.values(LEVELS).forEach(level => {
                const gridSize = level.gridSize;
                const blocked = new Set(
                    level.blockedCells.map(cell => `${cell.row},${cell.col}`)
                );

                // Track connectivity using BFS
                const visited = new Set<string>();
                const openCells: string[] = [];

                // Find first open cell
                let foundOpenCell = false;
                for (let row = 0; row < gridSize && !foundOpenCell; row++) {
                    for (let col = 0; col < gridSize && !foundOpenCell; col++) {
                        if (!blocked.has(`${row},${col}`)) {
                            openCells.push(`${row},${col}`);
                            foundOpenCell = true;
                        }
                    }
                }

                // If there are no open cells, connectivity is trivially satisfied
                if (!foundOpenCell) return;

                // BFS to explore all reachable open cells
                while (openCells.length > 0) {
                    const current = openCells.shift()!;
                    if (visited.has(current)) continue;

                    visited.add(current);
                    const [row, col] = current.split(',').map(Number);

                    // Check orthogonal neighbors
                    const neighbors = [
                        [row - 1, col], [row + 1, col],
                        [row, col - 1], [row, col + 1]
                    ].filter(([r, c]) =>
                        r >= 0 && r < gridSize && c >= 0 && c < gridSize &&
                        !blocked.has(`${r},${c}`)
                    );

                    neighbors.forEach(([r, c]) => {
                        const neighborKey = `${r},${c}`;
                        if (!visited.has(neighborKey)) {
                            openCells.push(neighborKey);
                        }
                    });
                }

                // Count all open cells
                const totalOpenCells = [];
                for (let row = 0; row < gridSize; row++) {
                    for (let col = 0; col < gridSize; col++) {
                        if (!blocked.has(`${row},${col}`)) {
                            totalOpenCells.push(`${row},${col}`);
                        }
                    }
                }

                // Create grid visualization for debugging
                const grid = [];
                for (let row = 0; row < gridSize; row++) {
                    const rowStr = [];
                    for (let col = 0; col < gridSize; col++) {
                        rowStr.push(blocked.has(`${row},${col}`) ? '█' : '□');
                    }
                    grid.push(rowStr.join(' '));
                }

                // If there are no open cells, connectivity is trivially satisfied
                if (totalOpenCells.length === 0) {
                    console.log(`${level.id}: No open cells (fully blocked grid)`);
                    return;
                }

                // Check for completely isolated open cells first
                const isolatedCells = totalOpenCells.filter(cellKey => {
                    const [row, col] = cellKey.split(',').map(Number);
                    const neighbors = [
                        [row - 1, col], [row + 1, col],
                        [row, col - 1], [row, col + 1]
                    ].filter(([r, c]) =>
                        r >= 0 && r < gridSize && c >= 0 && c < gridSize &&
                        !blocked.has(`${r},${c}`)
                    );
                    return neighbors.length === 0;
                });

                if (isolatedCells.length > 0) {
                    console.log(`${level.id}: Found ${isolatedCells.length} completely isolated open cells: [${isolatedCells.join(', ')}]`);
                    console.log(`Grid visualization:`);
                    grid.forEach((row, index) => {
                        const highlightedRow = isolatedCells.some(cell => {
                            const [cellRow] = cell.split(',').map(Number);
                            return cellRow === index;
                        });
                        console.log(`${index}: ${row}${highlightedRow ? ' ← ISOLATED CELLS HERE' : ''}`);
                    });
                    expect(isolatedCells).toHaveLength(0, `${level.id}: Completely isolated cells found`);
                }

                // Check connectivity between all open cells
                const isolatedCells2 = totalOpenCells.filter(cellKey => !visited.has(cellKey));
                if (isolatedCells2.length > 0) {
                    console.log(`${level.id}: ${isolatedCells2.length} open cells are not reachable from starting point [${totalOpenCells[0]}]`);
                    console.log(`Unreachable cells: [${isolatedCells2.join(', ')}]`);
                    console.log(`Grid visualization (□=open, █=blocked):`);
                    grid.forEach(row => console.log(row));
                }

                expect(isolatedCells2).toHaveLength(0,
                    `${level.id}: Connectivity issue - ${visited.size} reachable vs ${totalOpenCells.length} total open cells. Unreachable cells: [${isolatedCells2.join(', ')}]`
                );
            });
        });
    });
});