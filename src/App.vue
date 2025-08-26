<script setup lang="ts">
import Phaser from 'phaser';
import { ref, toRaw } from 'vue';
import type { MainMenu } from './game/scenes/MainMenu';
import PhaserGame from './PhaserGame.vue';

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
    // Settings scene not implemented yet
    console.log('Settings scene not implemented yet');
}

const playGame = () => {
    const scene = toRaw(phaserRef.value.scene) as Phaser.Scene;
    if (scene) {
        scene.scene.start('Game');
    }
}

// Event emitted from the PhaserGame component
const currentScene = (scene: any) => {
    // Update current scene name for button state management
    currentSceneName.value = scene.scene.key;
}

</script>

<template>
    <PhaserGame ref="phaserRef" @current-active-scene="currentScene" />
    <div>
        <div>
            <button class="button" @click="goToMainMenu" :disabled="currentSceneName === 'MainMenu'">Main Menu</button>
        </div>
        <div>
            <button class="button" @click="goToSettings" disabled>Settings</button>
        </div>
        <div>
            <button class="button" @click="playGame" :disabled="currentSceneName === 'Game'">Play Game</button>
        </div>
    </div>
</template>
