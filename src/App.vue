<script setup lang="ts">
import Phaser from 'phaser';
import { ref, toRaw } from 'vue';
import type { MainMenu } from './game/scenes/MainMenu';
import PhaserGameWrapper from './components/PhaserGameWrapper.vue';
import ErrorBoundary from './components/ErrorBoundary.vue';
import { errorLogger } from './game/ErrorLogger';

//  References to the PhaserGame component (game and scene are exposed)
const phaserRef = ref();
const currentSceneName = ref('MainMenu'); // Track current scene

const goToMainMenu = () => {
    const scene = toRaw(phaserRef.value.scene) as Phaser.Scene;
    if (scene) {
        scene.scene.start('MainMenu');
    }
}

const goToSettings = () => {
    const scene = toRaw(phaserRef.value.scene) as Phaser.Scene;
    if (scene) {
        scene.scene.start('Settings');
    }
}

const playGame = () => {
    const scene = toRaw(phaserRef.value.scene) as Phaser.Scene;
    if (scene) {
        // Check if there's a saved game state to resume
        const savedGameState = scene.game.registry.get('gameState');
        if (savedGameState) {
            // Resume the existing game
            scene.scene.start('Game');
        } else {
            // Start a new game and clear any previous state
            scene.game.registry.remove('gameState');
            scene.scene.start('Game');
        }
    }
}

// Event emitted from the PhaserGame component
const currentScene = (scene: any) => {
    // Update current scene name for button state management
    currentSceneName.value = scene.scene.key;
}

// Handle game errors
const handleGameError = (error: Error) => {
    console.error('[App] Game error:', error);
    // Could add global error handling UI here
}

// Handle game recovery
const handleGameRecovered = () => {
    console.log('[App] Game recovered from error');
    currentSceneName.value = 'MainMenu';
}

</script>

<style scoped>
.game-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
}

.controls {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 10px;
    padding: 10px;
    background-color: #333;
    flex-shrink: 0;
}

.button {
    padding: 8px 16px;
    font-size: 14px;
    border: none;
    border-radius: 4px;
    background-color: #666;
    color: white;
    cursor: pointer;
    transition: background-color 0.2s;
}

.button:hover:not(:disabled) {
    background-color: #888;
}

.button:disabled {
    background-color: #444;
    cursor: not-allowed;
    opacity: 0.6;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
    .controls {
        flex-direction: column;
        align-items: center;
    }
    
    .button {
        width: 200px;
        padding: 12px 16px;
        font-size: 16px;
        margin: 2px 0;
    }
}

/* Tablet styles */
@media (min-width: 769px) and (max-width: 1024px) {
    .button {
        padding: 10px 18px;
        font-size: 15px;
    }
}
</style>

<template>
    <ErrorBoundary @error="handleGameError" @recovered="handleGameRecovered">
        <div class="game-container">
            <!-- PhaserGameWrapper with error boundaries re-enabled -->
            <PhaserGameWrapper
                ref="phaserRef"
                @current-active-scene="currentScene"
                @game-error="handleGameError"
                @game-recovered="handleGameRecovered"
            />
            <div class="controls">
                <div>
                    <button class="button" @click="goToMainMenu" :disabled="currentSceneName === 'MainMenu'">Main Menu</button>
                </div>
                <div>
                    <button class="button" @click="goToSettings" :disabled="currentSceneName === 'Settings'">Settings</button>
                </div>
                <div>
                    <button class="button" @click="playGame" :disabled="currentSceneName === 'Game'">Play Game</button>
                </div>
            </div>
        </div>
    </ErrorBoundary>
</template>
