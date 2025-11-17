<template>
    <ErrorBoundary @error="handleGameError" @recovered="handleErrorRecovered">
        <PhaserGame
            v-if="!gameDestroyed"
            @current-active-scene="handleSceneReady"
            ref="phaserGameRef"
        />
        <div v-else class="game-destroyed">
            <h2>🎮 Game Session Ended</h2>
            <p>The game has been safely shut down. You can start a new game when ready.</p>
            <button @click="restartGame" class="restart-button">
                🆕 Start New Game
            </button>
        </div>
    </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import PhaserGame from '../PhaserGame.vue';
import ErrorBoundary from './ErrorBoundary.vue';
import { errorLogger } from '../game/ErrorLogger';
import { EventBus } from '../game/EventBus';

const emit = defineEmits<{
    'current-active-scene': [scene: any];
    'game-error': [error: Error];
    'game-recovered': [];
}>();

const phaserGameRef = ref();
const gameDestroyed = ref(false);
// Remove currentScene tracking - just expose from wrapped component
let errorCleanupHandle: (() => void) | null = null;

onMounted(() => {
    setupErrorHandling();
});

onUnmounted(() => {
    cleanupErrorHandling();
});

const setupErrorHandling = () => {
    // Be conservative with EventBus wrapping to avoid breaking functionality
    // Only wrap critical events
    const originalEmit = EventBus.emit;
    EventBus.emit = function(event: string, ...args: any[]) {
        try {
            return originalEmit.call(this, event, ...args);
        } catch (error) {
            errorLogger.logPhaserError(error, {
                component: 'EventBus',
                action: 'emit',
                scene: phaserGameRef.value?.scene?.constructor?.name
            });
            console.error('[PhaserGameWrapper] EventBus error:', error);
            // Don't return false to maintain compatibility
            throw error;
        }
    };

    // Store cleanup function
    errorCleanupHandle = () => {
        EventBus.emit = originalEmit;
    };
};

const cleanupErrorHandling = () => {
    if (errorCleanupHandle) {
        errorCleanupHandle();
        errorCleanupHandle = null;
    }
};

const handleSceneReady = (scene: any) => {
    // Be conservative with scene wrapping - only wrap non-critical methods
    if (scene && !scene._errorBoundaryWrapped) {
        wrapSceneWithErrorHandling(scene);
        scene._errorBoundaryWrapped = true;
    }

    emit('current-active-scene', scene);
};

const wrapSceneWithErrorHandling = (scene: any) => {
    // Only wrap non-critical methods to avoid breaking scene initialization
    const originalMethods = ['update']; // Skip create, shutdown, destroy, wake

    originalMethods.forEach(methodName => {
        if (typeof scene[methodName] === 'function') {
            const originalMethod = scene[methodName];
            scene[methodName] = function(...args: any[]) {
                try {
                    return originalMethod.apply(this, args);
                } catch (error) {
                    errorLogger.logPhaserError(error, {
                        component: 'Scene',
                        scene: scene.constructor.name,
                        action: `scene-${methodName}`
                    });
                    console.error(`[PhaserGameWrapper] Scene ${scene.constructor.name}.${methodName} error:`, error);
                    throw error; // Re-throw to let other handlers deal with it
                }
            };
        }
    });
};

const handleGameError = (error: Error, instance: any, info: string) => {
    console.error('[PhaserGameWrapper] Game error caught:', error);

    // Log additional game context
    const gameContext = {
        currentScene: phaserGameRef.value?.scene?.constructor?.name,
        gameDestroyed: gameDestroyed.value,
        hasPhaserGameRef: !!phaserGameRef.value
    };

    errorLogger.logError(error, `Game error in ${info}`, {
        component: 'PhaserGameWrapper',
        scene: phaserGameRef.value?.scene?.constructor?.name,
        action: 'game-runtime',
        gameState: gameContext
    });

    emit('game-error', error);

    // For critical errors, consider destroying the game instance
    if (isCriticalError(error)) {
        console.warn('[PhaserGameWrapper] Critical error detected, destroying game instance');
        destroyGameInstance();
    }
};

const handleErrorRecovered = () => {
    console.log('[PhaserGameWrapper] Error boundary recovered');
    emit('game-recovered');
};

const isCriticalError = (error: Error): boolean => {
    // Consider errors critical if they affect game initialization
    const criticalPatterns = [
        /phaser/i,
        /webgl/i,
        /canvas/i,
        /game/i,
        /scene/i,
        /registry/i
    ];

    return criticalPatterns.some(pattern =>
        pattern.test(error.message) ||
        pattern.test(error.stack || '')
    );
};

const destroyGameInstance = () => {
    try {
        // Safely destroy the game instance
        if (phaserGameRef.value && phaserGameRef.value.game) {
            phaserGameRef.value.game.destroy(true);
        }

        // Clear references
        currentScene = null;
        gameDestroyed.value = true;

        console.log('[PhaserGameWrapper] Game instance destroyed safely');
    } catch (error) {
        console.error('[PhaserGameWrapper] Error while destroying game instance:', error);
        errorLogger.logPhaserError(error, {
            component: 'PhaserGameWrapper',
            action: 'game-destruction'
        });
    }
};

const restartGame = () => {
    gameDestroyed.value = false;
    currentScene = null;

    // Clear any stuck game state
    try {
        if (typeof window !== 'undefined') {
            delete (window as any).gameInstance;
        }
    } catch (error) {
        console.warn('[PhaserGameWrapper] Could not clear global game instance:', error);
    }

    console.log('[PhaserGameWrapper] Game restarted');
    emit('game-recovered');
};

// Expose the scene from the wrapped PhaserGame component
const scene = computed(() => phaserGameRef.value?.scene);

// Expose methods and properties for parent components
defineExpose({
    restartGame,
    destroyGameInstance,
    getCurrentScene: () => phaserGameRef.value?.scene,
    getErrorLogger: () => errorLogger,
    scene, // Expose reactive scene property for compatibility
    game: phaserGameRef
});
</script>

<style scoped>
.game-destroyed {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 1rem;
    margin: 1rem;
}

.game-destroyed h2 {
    margin-top: 0;
    margin-bottom: 1rem;
}

.game-destroyed p {
    margin-bottom: 2rem;
    opacity: 0.9;
}

.restart-button {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.restart-button:hover {
    background: #059669;
    transform: translateY(-1px);
}
</style>