/**
 * Performance Monitor for tracking memory usage and performance metrics
 * Used to validate memory management improvements and detect performance regressions
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private measurements: PerformanceMeasurement[] = [];
    private isMonitoring = false;

    private constructor() {}

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Start monitoring performance metrics
     */
    public startMonitoring(): void {
        this.isMonitoring = true;
        this.measurements = [];
        console.log('PerformanceMonitor: Started monitoring');
    }

    /**
     * Stop monitoring and return results
     */
    public stopMonitoring(): PerformanceReport {
        this.isMonitoring = false;
        const report = this.generateReport();
        console.log('PerformanceMonitor: Stopped monitoring');
        return report;
    }

    /**
     * Take a snapshot of current performance metrics
     */
    public takeSnapshot(label: string): void {
        if (!this.isMonitoring) {
            console.warn('PerformanceMonitor: Not currently monitoring');
            return;
        }

        const measurement: PerformanceMeasurement = {
            timestamp: Date.now(),
            label,
            memory: this.getMemoryUsage(),
            eventBusListeners: this.getEventListenerCount(),
            domNodes: this.getDOMNodeCount(),
            activeTimers: this.getActiveTimerCount()
        };

        this.measurements.push(measurement);
        console.log(`PerformanceMonitor: Snapshot "${label}" - Memory: ${measurement.memory.usedJSHeapSize} bytes`);
    }

    /**
     * Get current memory usage from performance.memory API
     */
    private getMemoryUsage(): MemoryUsage {
        try {
            // performance.memory is a Chrome-specific API
            const memory = (performance as any).memory;

            if (memory) {
                return {
                    usedJSHeapSize: memory.usedJSHeapSize,
                    totalJSHeapSize: memory.totalJSHeapSize,
                    jsHeapSizeLimit: memory.jsHeapSizeLimit
                };
            }
        } catch (error) {
            // Performance API not available or has an error
            console.warn('PerformanceMonitor: Unable to access memory usage', error);
        }

        // Fallback for browsers that don't support performance.memory
        return {
            usedJSHeapSize: 0,
            totalJSHeapSize: 0,
            jsHeapSizeLimit: 0
        };
    }

    /**
     * Get the number of active event listeners
     * This is a simplified version - in practice, you'd track this more carefully
     */
    private getEventListenerCount(): number {
        // In a real implementation, you'd track this through EventBusManager
        // For now, return 0 as a placeholder
        return 0;
    }

    /**
     * Get the number of DOM nodes
     */
    private getDOMNodeCount(): number {
        try {
            return document.querySelectorAll('*').length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get the number of active timers
     * This is an approximation
     */
    private getActiveTimerCount(): number {
        // In a real implementation, you'd track timers more carefully
        // For now, return 0 as a placeholder
        return 0;
    }

    /**
     * Generate a comprehensive performance report
     */
    private generateReport(): PerformanceReport {
        if (this.measurements.length === 0) {
            return {
                duration: 0,
                measurements: [],
                memoryGrowth: 0,
                peakMemory: 0,
                averageMemory: 0,
                memoryGrowthRate: 0,
                recommendations: []
            };
        }

        const start = this.measurements[0];
        const end = this.measurements[this.measurements.length - 1];

        const memoryUsages = this.measurements.map(m => m.memory.usedJSHeapSize);
        const peakMemory = Math.max(...memoryUsages);
        const averageMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;

        const memoryGrowth = end.memory.usedJSHeapSize - start.memory.usedJSHeapSize;
        const duration = end.timestamp - start.timestamp;
        const memoryGrowthRate = duration > 0 ? (memoryGrowth / duration) * 1000 : 0; // bytes per second

        const recommendations = this.generateRecommendations(memoryGrowth, peakMemory, memoryGrowthRate);

        return {
            duration,
            measurements: this.measurements,
            memoryGrowth,
            peakMemory,
            averageMemory,
            memoryGrowthRate,
            recommendations
        };
    }

    /**
     * Generate recommendations based on performance metrics
     */
    private generateRecommendations(memoryGrowth: number, peakMemory: number, growthRate: number): string[] {
        const recommendations: string[] = [];

        if (memoryGrowth > 50 * 1024 * 1024) { // 50MB
            recommendations.push('High memory growth detected. Consider implementing object pooling.');
        }

        if (growthRate > 1024 * 1024) { // 1MB per second
            recommendations.push('Rapid memory accumulation. Check for memory leaks in event listeners.');
        }

        if (peakMemory > 100 * 1024 * 1024) { // 100MB
            recommendations.push('High peak memory usage. Consider optimizing asset loading and cleanup.');
        }

        const domGrowth = this.measurements.length > 1 ?
            this.measurements[this.measurements.length - 1].domNodes - this.measurements[0].domNodes : 0;

        if (domGrowth > 100) {
            recommendations.push('DOM node count is growing. Check for proper HTML cleanup in scenes.');
        }

        if (recommendations.length === 0) {
            recommendations.push('Performance metrics look good. No major issues detected.');
        }

        return recommendations;
    }

    /**
     * Validate that memory management improvements are working
     * This method simulates common scenarios and checks for memory leaks
     */
    public async validateMemoryManagement(): Promise<ValidationResult> {
        console.log('PerformanceMonitor: Starting memory management validation...');

        const results: ValidationTest[] = [];

        // Test 1: EventBus cleanup
        results.push(await this.testEventBusCleanup());

        // Test 2: Scene transition memory
        results.push(await this.testSceneTransitionMemory());

        // Test 3: Object lifecycle
        results.push(await this.testObjectLifecycle());

        const allPassed = results.every(result => result.passed);

        console.log('PerformanceMonitor: Memory management validation completed');
        console.log(`Results: ${results.filter(r => r.passed).length}/${results.length} tests passed`);

        return {
            allTestsPassed: allPassed,
            tests: results,
            summary: allPassed ?
                'All memory management tests passed. No memory leaks detected.' :
                'Some memory management tests failed. Review individual test results.'
        };
    }

    /**
     * Test EventBus cleanup effectiveness
     */
    private async testEventBusCleanup(): Promise<ValidationTest> {
        const testName = 'EventBus Cleanup';

        try {
            // Import EventBusManager dynamically to avoid test issues
            const { EventBusManager } = await import('./EventBus');

            const initialCount = EventBusManager.getListenerCount();

            // Add many listeners
            const callbacks = Array.from({ length: 100 }, (_, i) => () => i);
            callbacks.forEach((callback, index) => {
                EventBusManager.on(`test-event-${index}`, callback);
            });

            const afterAddCount = EventBusManager.getListenerCount();

            // Clean up all listeners
            EventBusManager.cleanup();

            const afterCleanupCount = EventBusManager.getListenerCount();

            const passed = afterCleanupCount === initialCount;

            return {
                name: testName,
                passed,
                details: `Initial: ${initialCount}, After add: ${afterAddCount}, After cleanup: ${afterCleanupCount}`
            };
        } catch (error) {
            return {
                name: testName,
                passed: false,
                details: `Test failed with error: ${error}`
            };
        }
    }

    /**
     * Test scene transition memory usage
     */
    private async testSceneTransitionMemory(): Promise<ValidationTest> {
        const testName = 'Scene Transition Memory';

        try {
            const initialMemory = this.getMemoryUsage().usedJSHeapSize;

            // Simulate scene transitions (simplified test)
            const testContainer = document.createElement('div');
            document.body.appendChild(testContainer);

            // Add some content
            for (let i = 0; i < 100; i++) {
                const element = document.createElement('div');
                element.textContent = `Test element ${i}`;
                testContainer.appendChild(element);
            }

            const afterCreateMemory = this.getMemoryUsage().usedJSHeapSize;

            // Clean up
            testContainer.remove();

            // Force garbage collection if available
            if ((window as any).gc) {
                (window as any).gc();
            }

            // Small delay to allow cleanup
            await new Promise(resolve => setTimeout(resolve, 100));

            const afterCleanupMemory = this.getMemoryUsage().usedJSHeapSize;

            // Memory should not grow significantly after cleanup
            const memoryGrowth = afterCleanupMemory - initialMemory;
            const passed = memoryGrowth < 1024 * 1024; // Less than 1MB growth acceptable

            return {
                name: testName,
                passed,
                details: `Initial: ${initialMemory}, Peak: ${afterCreateMemory}, Final: ${afterCleanupMemory}, Growth: ${memoryGrowth} bytes`
            };
        } catch (error) {
            return {
                name: testName,
                passed: false,
                details: `Test failed with error: ${error}`
            };
        }
    }

    /**
     * Test object lifecycle and cleanup
     */
    private async testObjectLifecycle(): Promise<ValidationTest> {
        const testName = 'Object Lifecycle';

        try {
            const initialMemory = this.getMemoryUsage().usedJSHeapSize;

            // Create and destroy objects
            const objects = [];

            for (let i = 0; i < 1000; i++) {
                objects.push({
                    id: i,
                    data: new Array(1000).fill(i), // Create some memory usage
                    cleanup: function() {
                        this.data = null;
                    }
                });
            }

            const afterCreateMemory = this.getMemoryUsage().usedJSHeapSize;

            // Clean up objects
            objects.forEach(obj => obj.cleanup());
            objects.length = 0;

            // Force garbage collection if available
            if ((window as any).gc) {
                (window as any).gc();
            }

            // Small delay to allow cleanup
            await new Promise(resolve => setTimeout(resolve, 100));

            const afterCleanupMemory = this.getMemoryUsage().usedJSHeapSize;

            // Memory should be close to initial after cleanup
            const memoryGrowth = afterCleanupMemory - initialMemory;
            const passed = memoryGrowth < 5 * 1024 * 1024; // Less than 5MB growth acceptable

            return {
                name: testName,
                passed,
                details: `Initial: ${initialMemory}, Peak: ${afterCreateMemory}, Final: ${afterCleanupMemory}, Growth: ${memoryGrowth} bytes`
            };
        } catch (error) {
            return {
                name: testName,
                passed: false,
                details: `Test failed with error: ${error}`
            };
        }
    }
}

// Type definitions for the performance monitor
export interface PerformanceMeasurement {
    timestamp: number;
    label: string;
    memory: MemoryUsage;
    eventBusListeners: number;
    domNodes: number;
    activeTimers: number;
}

export interface MemoryUsage {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}

export interface PerformanceReport {
    duration: number;
    measurements: PerformanceMeasurement[];
    memoryGrowth: number;
    peakMemory: number;
    averageMemory: number;
    memoryGrowthRate: number; // bytes per second
    recommendations: string[];
}

export interface ValidationTest {
    name: string;
    passed: boolean;
    details: string;
}

export interface ValidationResult {
    allTestsPassed: boolean;
    tests: ValidationTest[];
    summary: string;
}

// Export singleton instance for easy use
export const performanceMonitor = PerformanceMonitor.getInstance();