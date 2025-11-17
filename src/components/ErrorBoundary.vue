<template>
    <div v-if="hasError" class="error-boundary">
        <div class="error-overlay">
            <div class="error-content">
                <h2>🎮 Oops! Something went wrong</h2>
                <p>The game encountered an error, but don't worry - your progress is safe!</p>

                <div class="error-details" v-if="showDetails">
                    <h3>Error Details:</h3>
                    <pre>{{ errorMessage }}</pre>
                    <button @click="copyErrorToClipboard" class="copy-button">
                        📋 Copy Error Info
                    </button>
                </div>

                <div class="error-actions">
                    <button @click="retry" class="primary-button">
                        🔄 Try Again
                    </button>
                    <button @click="resetGame" class="secondary-button">
                        🆕 New Game
                    </button>
                    <button @click="toggleDetails" class="tertiary-button">
                        {{ showDetails ? 'Hide' : 'Show' }} Details
                    </button>
                </div>

                <div class="recent-errors" v-if="recentErrors.length > 0 && showDetails">
                    <h4>Recent Errors ({{ recentErrors.length }})</h4>
                    <div class="error-list">
                        <div v-for="(err, index) in recentErrors.slice(-3)" :key="index" class="error-item">
                            <span class="error-time">{{ new Date(err.context.timestamp).toLocaleTimeString() }}</span>
                            <span class="error-message">{{ err.message }}</span>
                            <span class="error-severity" :class="err.severity">{{ err.severity }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <slot v-else></slot>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, onMounted } from 'vue';
import { errorLogger, GameError } from '../game/ErrorLogger';

const props = defineProps<{
    fallbackComponent?: string;
    enableRetry?: boolean;
}>();

const emit = defineEmits<{
    error: [error: Error, instance: any, info: string];
    recovered: [];
}>();

const hasError = ref(false);
const errorMessage = ref('');
const showDetails = ref(false);
const recentErrors = ref<GameError[]>([]);

onMounted(() => {
    recentErrors.value = errorLogger.getRecentErrors(10);
});

onErrorCaptured((error: Error, instance: any, info: string) => {
    console.error('[ErrorBoundary] Caught error:', error);

    hasError.value = true;
    errorMessage.value = error.message || 'Unknown error occurred';

    // Log the error with full context
    errorLogger.logVueError(error, instance, info);

    // Update recent errors
    recentErrors.value = errorLogger.getRecentErrors(10);

    // Emit error event for parent components
    emit('error', error, instance, info);

    // Prevent the error from propagating further
    return false;
});

const retry = () => {
    hasError.value = false;
    errorMessage.value = '';
    emit('recovered');
};

const resetGame = () => {
    // Clear game state from registry
    if (typeof window !== 'undefined' && window.gameInstance) {
        window.gameInstance.registry.reset();
    }

    // Clear errors
    errorLogger.clearHistory();
    recentErrors.value = [];

    hasError.value = false;
    errorMessage.value = '';
    emit('recovered');
};

const toggleDetails = () => {
    showDetails.value = !showDetails.value;
};

const copyErrorToClipboard = async () => {
    try {
        const errorData = errorLogger.exportErrors();
        await navigator.clipboard.writeText(errorData);
        alert('Error information copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy error data:', err);
        alert('Failed to copy error information');
    }
};
</script>

<style scoped>
.error-boundary {
    position: relative;
}

.error-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.error-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 1rem;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.error-content h2 {
    margin-top: 0;
    font-size: 1.8rem;
    text-align: center;
}

.error-content p {
    text-align: center;
    opacity: 0.9;
    margin-bottom: 1.5rem;
}

.error-details {
    background: rgba(0, 0, 0, 0.2);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
}

.error-details h3 {
    margin-top: 0;
    font-size: 1.1rem;
}

.error-details pre {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.5rem;
    border-radius: 0.25rem;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-size: 0.9rem;
    margin-bottom: 1rem;
}

.copy-button {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.9rem;
}

.copy-button:hover {
    background: rgba(255, 255, 255, 0.3);
}

.error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
}

.primary-button,
.secondary-button,
.tertiary-button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
}

.primary-button {
    background: #10b981;
    color: white;
}

.primary-button:hover {
    background: #059669;
    transform: translateY(-1px);
}

.secondary-button {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.secondary-button:hover {
    background: rgba(255, 255, 255, 0.3);
}

.tertiary-button {
    background: transparent;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.tertiary-button:hover {
    background: rgba(255, 255, 255, 0.1);
}

.recent-errors {
    background: rgba(0, 0, 0, 0.2);
    padding: 1rem;
    border-radius: 0.5rem;
}

.recent-errors h4 {
    margin-top: 0;
    font-size: 1rem;
}

.error-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.error-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
}

.error-time {
    opacity: 0.7;
    font-family: monospace;
}

.error-message {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.error-severity {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.error-severity.low {
    background: rgba(34, 197, 94, 0.3);
}

.error-severity.medium {
    background: rgba(251, 191, 36, 0.3);
}

.error-severity.high {
    background: rgba(239, 68, 68, 0.3);
}

.error-severity.critical {
    background: rgba(127, 29, 29, 0.3);
}
</style>