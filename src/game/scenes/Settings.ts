import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Settings extends Scene
{
    background: GameObjects.Image;
    title: GameObjects.Text;
    soundEffectsEnabled: boolean = true;
    soundToggleButton: GameObjects.Text;
    backButton: GameObjects.Text;

    constructor ()
    {
        super('Settings');
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.3);

        this.title = this.add.text(512, 100, 'Settings', {
            fontFamily: 'Arial Black', 
            fontSize: 48, 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Load saved settings
        this.loadSettings();

        // Sound Effects Toggle
        this.add.text(300, 250, 'Sound Effects:', {
            fontFamily: 'Arial', 
            fontSize: 24, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.soundToggleButton = this.add.text(500, 250, '', {
            fontFamily: 'Arial', 
            fontSize: 24, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 20, y: 10 }
        }).setOrigin(0, 0.5);

        this.soundToggleButton.setInteractive();
        this.soundToggleButton.on('pointerdown', () => {
            this.toggleSoundEffects();
        });

        this.soundToggleButton.on('pointerover', () => {
            this.soundToggleButton.setBackgroundColor('#888888');
        });

        this.soundToggleButton.on('pointerout', () => {
            this.soundToggleButton.setBackgroundColor('#666666');
        });

        // Placeholder for future settings
        this.add.text(512, 350, 'More settings coming soon...', {
            fontFamily: 'Arial', 
            fontSize: 18, 
            color: '#888888'
        }).setOrigin(0.5);

        // Back button
        this.backButton = this.add.text(512, 500, 'Back to Main Menu', {
            fontFamily: 'Arial', 
            fontSize: 24, 
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.backButton.setInteractive();
        this.backButton.on('pointerdown', () => {
            this.goBack();
        });

        this.backButton.on('pointerover', () => {
            this.backButton.setBackgroundColor('#555555');
        });

        this.backButton.on('pointerout', () => {
            this.backButton.setBackgroundColor('#333333');
        });

        this.updateSoundToggleButton();

        EventBus.emit('current-scene-ready', this);
    }

    loadSettings()
    {
        // Load sound effects setting from localStorage
        const savedSoundSetting = localStorage.getItem('dotsGame_soundEffects');
        if (savedSoundSetting !== null) {
            this.soundEffectsEnabled = savedSoundSetting === 'true';
        }
    }

    saveSettings()
    {
        // Save sound effects setting to localStorage
        localStorage.setItem('dotsGame_soundEffects', this.soundEffectsEnabled.toString());
    }

    toggleSoundEffects()
    {
        this.soundEffectsEnabled = !this.soundEffectsEnabled;
        this.updateSoundToggleButton();
        this.saveSettings();
        
        // Update global sound setting
        this.game.registry.set('soundEffectsEnabled', this.soundEffectsEnabled);
        
        console.log(`Sound effects ${this.soundEffectsEnabled ? 'enabled' : 'disabled'}`);
    }

    updateSoundToggleButton()
    {
        this.soundToggleButton.setText(this.soundEffectsEnabled ? 'ON' : 'OFF');
        this.soundToggleButton.setColor(this.soundEffectsEnabled ? '#00ff00' : '#ff0000');
        
        // Set global registry value
        this.game.registry.set('soundEffectsEnabled', this.soundEffectsEnabled);
    }

    goBack()
    {
        this.scene.start('MainMenu');
    }
}
