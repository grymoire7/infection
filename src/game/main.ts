import { About } from './scenes/About';
import { Tutorial } from './scenes/Tutorial';
import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { LevelOver } from './scenes/LevelOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { Settings } from './scenes/Settings';
import { Splash } from './scenes/Splash';

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 320,
            height: 240
        },
        max: {
            width: 1920,
            height: 1440
        }
    },
    scene: [
        Boot,
        Preloader,
        Splash,
        MainMenu,
        About,
        Tutorial,
        Settings,
        MainGame,
        LevelOver,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
