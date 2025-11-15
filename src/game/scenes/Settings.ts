import { GameObjects } from 'phaser';
import { EventBus } from '../EventBus';
import { LEVEL_SETS } from '../LevelDefinitions';
import { SettingsManager, GameSettings } from '../SettingsManager';
import { BaseScene } from '../BaseScene';

export class Settings extends BaseScene
{
    background: GameObjects.Image;
    title: GameObjects.Text;
    soundToggleButton: GameObjects.Text;
    playerColorButton: GameObjects.Text;
    playerSprite: GameObjects.Sprite;
    levelSetButton: GameObjects.Text;
    
    private settingsManager: SettingsManager;
    private currentSettings: GameSettings;

    constructor ()
    {
        super('Settings');
    }

    create ()
    {
        // Initialize settings manager
        this.settingsManager = new SettingsManager(this.game.registry);
        this.currentSettings = this.settingsManager.getCurrentSettings();
        
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        this.background = this.add.image(centerX, centerY, 'background');
        this.background.setAlpha(0.3);

        const titleFontSize = Math.min(48, this.cameras.main.width / 15);
        this.title = this.add.text(centerX, centerY * 0.25, 'Settings', {
            fontFamily: 'Arial Black', 
            fontSize: titleFontSize, 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);


        // Responsive Sound Effects Toggle
        const labelFontSize = Math.min(24, this.cameras.main.width / 30);
        const labelX = centerX - 100;
        const labelY = centerY * 0.65;
        
        this.add.text(labelX, labelY, 'Sound:', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.soundToggleButton = this.add.text(labelX + 100, labelY, '', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 15, y: 8 }
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

        // Player Selection
        const playerColorLabelY = centerY * 0.8;
        this.add.text(labelX, playerColorLabelY, 'Player:', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        // Create animated sprite for player selection
        const spriteSize = Math.min(2.5, this.cameras.main.width / 250);
        const spriteX = labelX + 100;
        this.playerSprite = this.add.sprite(spriteX, playerColorLabelY, 'evil-sprite');
        this.playerSprite.setScale(spriteSize);
        this.playerSprite.play('evil-dot-pulse');
        this.playerSprite.setOrigin(0, 0.5);

        // Create invisible button area around the sprite for interaction
        this.playerColorButton = this.add.text(spriteX, playerColorLabelY, '        ', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: 'transparent',
            backgroundColor: 'transparent',
            padding: { x: 20, y: 15 }
        }).setOrigin(0, 0.5);

        this.playerColorButton.setInteractive();
        this.playerColorButton.on('pointerdown', () => {
            this.togglePlayerColor();
        });

        this.playerColorButton.on('pointerover', () => {
            this.playerSprite.setTint(0xcccccc);
        });

        this.playerColorButton.on('pointerout', () => {
            this.playerSprite.clearTint();
        });

        // Level Set Selection
        const levelSetLabelY = centerY * 0.95;
        this.add.text(labelX, levelSetLabelY, 'Levels:', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.levelSetButton = this.add.text(labelX + 100, levelSetLabelY, '', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 15, y: 8 }
        }).setOrigin(0, 0.5);

        this.levelSetButton.setInteractive();
        this.levelSetButton.on('pointerdown', () => {
            this.cycleLevelSet();
        });

        this.levelSetButton.on('pointerover', () => {
            this.levelSetButton.setBackgroundColor('#888888');
        });

        this.levelSetButton.on('pointerout', () => {
            this.levelSetButton.setBackgroundColor('#666666');
        });

        this.updateSoundToggleButton();
        this.updatePlayerSprite();
        this.updateLevelSetButton();

        EventBus.emit('current-scene-ready', this);
    }

    toggleSoundEffects()
    {
        this.currentSettings.soundEffectsEnabled = !this.currentSettings.soundEffectsEnabled;
        this.settingsManager.updateSetting('soundEffectsEnabled', this.currentSettings.soundEffectsEnabled);
        this.updateSoundToggleButton();
        
        console.log(`Sound effects ${this.currentSettings.soundEffectsEnabled ? 'enabled' : 'disabled'}`);
    }

    updateSoundToggleButton()
    {
        this.soundToggleButton.setText(this.currentSettings.soundEffectsEnabled ? 'ON' : 'OFF');
        this.soundToggleButton.setColor(this.currentSettings.soundEffectsEnabled ? '#00ff00' : '#ff0000');
    }


    togglePlayerColor()
    {
        this.currentSettings.playerColor = this.currentSettings.playerColor === 'red' ? 'blue' : 'red';
        this.settingsManager.updateSetting('playerColor', this.currentSettings.playerColor);
        this.updatePlayerSprite();
        
        console.log(`Player color set to: ${this.currentSettings.playerColor}`);
    }

    updatePlayerSprite()
    {
        if (this.currentSettings.playerColor === 'red') {
            this.playerSprite.setTexture('evil-sprite');
            this.playerSprite.play('evil-dot-pulse');
        } else {
            this.playerSprite.setTexture('good-sprite');
            this.playerSprite.play('good-dot-pulse');
        }
    }

    cycleLevelSet()
    {
        const levelSets = LEVEL_SETS;
        const currentIndex = levelSets.findIndex(set => set.id === this.currentSettings.levelSetId);
        const nextIndex = (currentIndex + 1) % levelSets.length;
        this.currentSettings.levelSetId = levelSets[nextIndex].id;
        
        this.settingsManager.updateSetting('levelSetId', this.currentSettings.levelSetId);
        this.updateLevelSetButton();
        
        console.log(`Level Set changed to: ${this.currentSettings.levelSetId}`);
    }

    updateLevelSetButton()
    {
        const levelSet = LEVEL_SETS.find(set => set.id === this.currentSettings.levelSetId);
        const displayText = levelSet ? levelSet.name : 'Default Levels';
        this.levelSetButton.setText(displayText);
        this.levelSetButton.setColor('#ffffff');
    }

    /**
     * Override shutdown to handle scene-specific cleanup
     */
    public shutdown(): void {
        console.log('Settings: Starting shutdown cleanup');

        // Clean up interactive elements
        this.safeRemoveInteractive(this.soundToggleButton);
        this.safeRemoveInteractive(this.playerColorButton);
        this.safeRemoveInteractive(this.levelSetButton);

        // Clean up display objects
        this.safeDestroy(this.soundToggleButton);
        this.safeDestroy(this.playerColorButton);
        this.safeDestroy(this.levelSetButton);
        this.safeDestroy(this.playerSprite);
        this.safeDestroy(this.title);
        this.safeDestroy(this.background);

        // Call parent shutdown for base cleanup
        super.shutdown();

        console.log('Settings: Shutdown cleanup completed');
    }
}
