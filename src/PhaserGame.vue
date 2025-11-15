<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { EventBus, EventBusManager } from './game/EventBus';
import StartGame from './game/main';
import Phaser from 'phaser';

// Save the current scene instance
const scene = ref();
const game = ref();

const emit = defineEmits(['current-active-scene']);

// Track the scene ready callback for cleanup
const onSceneReady = (scene_instance: Phaser.Scene) => {
    emit('current-active-scene', scene_instance);
    scene.value = scene_instance;
};

onMounted(() => {
    game.value = StartGame('game-container');

    // Use EventBusManager to track the listener for cleanup
    EventBusManager.on('current-scene-ready', onSceneReady);
});

onUnmounted(() => {
    // Clean up EventBus listeners to prevent memory leaks
    EventBusManager.off('current-scene-ready');

    // Clean up the game instance
    if (game.value) {
        game.value.destroy(true);
        game.value = null;
    }

    // Debug: Log cleanup completion
    console.log('PhaserGame: Cleanup completed, active listeners:', EventBusManager.getListenerCount());
});

defineExpose({ scene, game });

</script>

<template>
    <div id="game-container"></div>
</template>