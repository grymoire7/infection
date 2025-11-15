import { Events } from 'phaser';

// Used to emit events between components, HTML and Phaser scenes
export const EventBus = new Events.EventEmitter();

/**
 * Cleanup methods for EventBus to prevent memory leaks
 */
export class EventBusManager {
    private static listeners: Map<string, Function[]> = new Map();

    /**
     * Register a listener with tracking for cleanup
     */
    static on(event: string, callback: Function, context?: any): void {
        EventBus.on(event, callback, context);

        // Track the listener for cleanup
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    /**
     * Remove all listeners for a specific event
     */
    static off(event: string): void {
        EventBus.removeAllListeners(event);
        this.listeners.delete(event);
    }

    /**
     * Remove a specific listener
     */
    static removeListener(event: string, callback: Function): void {
        EventBus.off(event, callback);

        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(callback);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
            if (eventListeners.length === 0) {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * Clean up all listeners (useful for component unmounting)
     */
    static cleanup(): void {
        EventBus.removeAllListeners();
        this.listeners.clear();
    }

    /**
     * Get the number of active listeners for debugging
     */
    static getListenerCount(): number {
        return this.listeners.size;
    }

    /**
     * Get all active event names for debugging
     */
    static getActiveEvents(): string[] {
        return Array.from(this.listeners.keys());
    }
}