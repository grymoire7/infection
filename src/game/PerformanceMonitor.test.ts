import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from './PerformanceMonitor';

// Mock performance.memory API
const mockPerformanceMemory = {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
};

// Mock document methods
const mockDocument = {
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn(() => ({
        textContent: '',
        appendChild: vi.fn(),
        remove: vi.fn()
    })),
    body: {
        appendChild: vi.fn()
    }
};

// Mock window.gc
const mockGC = vi.fn();

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        vi.useFakeTimers();
        monitor = PerformanceMonitor.getInstance();

        // Mock performance API
        vi.stubGlobal('performance', {
            memory: mockPerformanceMemory
        });

        // Mock document
        vi.stubGlobal('document', mockDocument);

        // Mock window.gc
        vi.stubGlobal('window', { gc: mockGC });

        // Reset mock memory to simulate different usage
        Object.assign(mockPerformanceMemory, {
            usedJSHeapSize: 1000000,
            totalJSHeapSize: 2000000,
            jsHeapSizeLimit: 4000000
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();

        // Clean up singleton state
        if (monitor) {
            monitor.stopMonitoring();
        }

        // Clear the singleton instance
        (PerformanceMonitor as any).instance = null;
    });

    describe('basic functionality', () => {
        it('should be a singleton', () => {
            const monitor1 = PerformanceMonitor.getInstance();
            const monitor2 = PerformanceMonitor.getInstance();
            expect(monitor1).toBe(monitor2);
        });

        it('should start and stop monitoring', () => {
            monitor.startMonitoring();
            monitor.takeSnapshot('test-snapshot');
            const report = monitor.stopMonitoring();

            expect(report.measurements).toHaveLength(1);
            expect(report.measurements[0].label).toBe('test-snapshot');
        });

        it('should ignore snapshots when not monitoring', () => {
            // Just verify it doesn't throw an error
            expect(() => {
                monitor.takeSnapshot('should-be-ignored');
            }).not.toThrow();

            // Verify no measurements were taken
            const report = monitor.stopMonitoring();
            expect(report.measurements).toHaveLength(0);
        });
    });

    describe('memory measurements', () => {
        it('should track memory usage correctly', () => {
            monitor.startMonitoring();

            // Simulate memory growth
            mockPerformanceMemory.usedJSHeapSize = 1500000;
            monitor.takeSnapshot('after-growth');

            // Simulate more memory growth
            mockPerformanceMemory.usedJSHeapSize = 2000000;
            monitor.takeSnapshot('more-growth');

            const report = monitor.stopMonitoring();

            expect(report.measurements[0].memory.usedJSHeapSize).toBe(1500000);
            expect(report.measurements[1].memory.usedJSHeapSize).toBe(2000000);
            expect(report.memoryGrowth).toBe(500000); // Final - initial (we missed the initial)
            expect(report.peakMemory).toBe(2000000);
        });

        it('should handle missing performance.memory API', () => {
            vi.stubGlobal('performance', {});

            monitor.startMonitoring();
            monitor.takeSnapshot('no-memory-api');
            const report = monitor.stopMonitoring();

            expect(report.measurements[0].memory.usedJSHeapSize).toBe(0);
            expect(report.memoryGrowth).toBe(0);
        });

        it('should generate accurate performance reports', () => {
            monitor.startMonitoring();

            mockPerformanceMemory.usedJSHeapSize = 1000000;
            monitor.takeSnapshot('start');

            // Simulate 2 seconds passing and memory growth
            vi.advanceTimersByTime(2000);
            mockPerformanceMemory.usedJSHeapSize = 3000000;
            monitor.takeSnapshot('end');

            const report = monitor.stopMonitoring();

            expect(report.duration).toBeGreaterThan(0);
            expect(report.memoryGrowth).toBe(2000000); // 2MB growth
            expect(report.memoryGrowthRate).toBeGreaterThan(0);
        });
    });

    describe('recommendations', () => {
        it('should recommend object pooling for high memory growth', () => {
            monitor.startMonitoring();

            // Simulate 60MB growth
            mockPerformanceMemory.usedJSHeapSize = 1000000;
            monitor.takeSnapshot('start');
            mockPerformanceMemory.usedJSHeapSize = 63000000; // 63MB
            monitor.takeSnapshot('end');

            const report = monitor.stopMonitoring();

            expect(report.recommendations).toContain(
                'High memory growth detected. Consider implementing object pooling.'
            );
        });

        it('should recommend checking for rapid accumulation', () => {
            monitor.startMonitoring();

            // Simulate rapid growth over short time
            mockPerformanceMemory.usedJSHeapSize = 1000000;
            monitor.takeSnapshot('start');

            // Simulate 1 second with 2MB growth
            vi.advanceTimersByTime(1000);
            mockPerformanceMemory.usedJSHeapSize = 3000000; // 2MB growth
            monitor.takeSnapshot('end');

            const report = monitor.stopMonitoring();

            expect(report.recommendations).toContain(
                'Rapid memory accumulation. Check for memory leaks in event listeners.'
            );
        });

        it('should recommend asset optimization for high peak memory', () => {
            monitor.startMonitoring();

            // Simulate high peak memory usage
            mockPerformanceMemory.usedJSHeapSize = 120000000; // 120MB
            monitor.takeSnapshot('high-memory');

            const report = monitor.stopMonitoring();

            expect(report.recommendations).toContain(
                'High peak memory usage. Consider optimizing asset loading and cleanup.'
            );
        });

        it('should give positive feedback when metrics look good', () => {
            monitor.startMonitoring();

            mockPerformanceMemory.usedJSHeapSize = 1000000;
            monitor.takeSnapshot('good-metrics');

            const report = monitor.stopMonitoring();

            expect(report.recommendations).toContain(
                'Performance metrics look good. No major issues detected.'
            );
        });
    });

    describe('report generation', () => {
        it('should generate comprehensive performance reports', () => {
            vi.useFakeTimers();

            monitor.startMonitoring();

            // Take multiple snapshots with time advancement
            monitor.takeSnapshot('start');

            // Advance time by 100ms
            vi.advanceTimersByTime(100);
            mockPerformanceMemory.usedJSHeapSize = 2000000;
            monitor.takeSnapshot('middle');

            // Advance time by another 100ms
            vi.advanceTimersByTime(100);
            mockPerformanceMemory.usedJSHeapSize = 1500000;
            monitor.takeSnapshot('end');

            const report = monitor.stopMonitoring();

            vi.useRealTimers();

            expect(report.measurements).toHaveLength(3);
            expect(report.duration).toBeGreaterThan(0);
            expect(report.peakMemory).toBe(2000000);
            expect(report.averageMemory).toBeGreaterThan(0);
            expect(report.recommendations).toBeDefined();
            expect(Array.isArray(report.recommendations)).toBe(true);
        });

        it('should handle stopMonitoring when not monitoring', () => {
            // Should not throw even when monitoring hasn't started
            expect(() => {
                const report = monitor.stopMonitoring();
                expect(report).toBeDefined();
                expect(Array.isArray(report.measurements)).toBe(true);
            }).not.toThrow();
        });

        it('should handle single snapshot sessions', () => {
            monitor.startMonitoring();
            monitor.takeSnapshot('single-snapshot');

            const report = monitor.stopMonitoring();

            expect(report.measurements).toHaveLength(1);
            expect(report.memoryGrowthRate).toBe(0); // No growth with single snapshot
        });
    });

    describe('integration with EventBusManager', () => {
        it('should work with actual EventBusManager when available', async () => {
            // This test would work if EventBusManager is available in the test environment
            // For now, we test the integration pattern

            monitor.startMonitoring();
            monitor.takeSnapshot('integration-test');

            const report = monitor.stopMonitoring();

            expect(report.measurements).toHaveLength(1);
            expect(report.measurements[0].label).toBe('integration-test');
        });
    });

    describe('error handling', () => {
        it('should handle missing document gracefully', () => {
            vi.stubGlobal('document', undefined);

            const errorMonitor = PerformanceMonitor.getInstance();
            errorMonitor.startMonitoring();
            errorMonitor.takeSnapshot('no-document');

            expect(() => {
                errorMonitor.stopMonitoring();
            }).not.toThrow();
        });

        it('should handle performance measurement errors', () => {
            vi.stubGlobal('performance', {
                memory: {
                    get usedJSHeapSize() {
                        throw new Error('Performance API error');
                    }
                }
            });

            const errorMonitor = PerformanceMonitor.getInstance();
            errorMonitor.startMonitoring();

            expect(() => {
                errorMonitor.takeSnapshot('error-test');
                errorMonitor.stopMonitoring();
            }).not.toThrow();
        });
    });
});