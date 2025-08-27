import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Settings extends Scene
{
    background: GameObjects.Image;
    title: GameObjects.Text;
    soundEffectsEnabled: boolean = true;
    soundToggleButton: GameObjects.Text;
    difficultyLevel: string = 'Easy';
    difficultyButton: GameObjects.Text;
    backButton: GameObjects.Text;

    constructor ()
    {
        super('Settings');
    }

    create ()
    {
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

        // Load saved settings
        this.loadSettings();

        // Responsive Sound Effects Toggle
        const labelFontSize = Math.min(24, this.cameras.main.width / 30);
        const labelX = centerX - 100;
        const labelY = centerY * 0.65;
        
        this.add.text(labelX, labelY, 'Sound Effects:', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.soundToggleButton = this.add.text(labelX + 150, labelY, '', {
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

        // Difficulty Level Selection
        const difficultyLabelY = centerY * 0.8;
        this.add.text(labelX, difficultyLabelY, 'AI Difficulty:', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.difficultyButton = this.add.text(labelX + 150, difficultyLabelY, '', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 15, y: 8 }
        }).setOrigin(0, 0.5);

        this.difficultyButton.setInteractive();
        this.difficultyButton.on('pointerdown', () => {
            this.cycleDifficultyLevel();
        });

        this.difficultyButton.on('pointerover', () => {
            this.difficultyButton.setBackgroundColor('#888888');
        });

        this.difficultyButton.on('pointerout', () => {
            this.difficultyButton.setBackgroundColor('#666666');
        });

        // Responsive placeholder for future settings
        const placeholderFontSize = Math.min(18, this.cameras.main.width / 45);
        this.add.text(centerX, centerY * 1.05, 'More settings coming soon...', {
            fontFamily: 'Arial', 
            fontSize: placeholderFontSize, 
            color: '#888888'
        }).setOrigin(0.5);

        // Responsive back button
        const backButtonFontSize = Math.min(24, this.cameras.main.width / 30);
        this.backButton = this.add.text(centerX, centerY * 1.3, 'Back to Main Menu', {
            fontFamily: 'Arial', 
            fontSize: backButtonFontSize, 
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 8 }
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
        this.updateDifficultyButton();

        EventBus.emit('current-scene-ready', this);
    }

    loadSettings()
    {
        // Load sound effects setting from localStorage
        const savedSoundSetting = localStorage.getItem('dotsGame_soundEffects');
        if (savedSoundSetting !== null) {
            this.soundEffectsEnabled = savedSoundSetting === 'true';
        }

        // Load difficulty level setting from localStorage
        const savedDifficulty = localStorage.getItem('dotsGame_difficultyLevel');
        if (savedDifficulty !== null) {
            this.difficultyLevel = savedDifficulty;
        }
    }

    saveSettings()
    {
        // Save sound effects setting to localStorage
        localStorage.setItem('dotsGame_soundEffects', this.soundEffectsEnabled.toString());
        
        // Save difficulty level setting to localStorage
        localStorage.setItem('dotsGame_difficultyLevel', this.difficultyLevel);
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

    cycleDifficultyLevel()
    {
        const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];
        const currentIndex = difficulties.indexOf(this.difficultyLevel);
        const nextIndex = (currentIndex + 1) % difficulties.length;
        this.difficultyLevel = difficulties[nextIndex];
        
        this.updateDifficultyButton();
        this.saveSettings();
        
        // Update global difficulty setting
        this.game.registry.set('difficultyLevel', this.difficultyLevel);
        
        console.log(`AI Difficulty set to: ${this.difficultyLevel}`);
    }

    updateDifficultyButton()
    {
        this.difficultyButton.setText(this.difficultyLevel);
        
        // Color code difficulty levels
        const difficultyColors = {
            'Easy': '#00ff00',    // Green
            'Medium': '#ffff00',  // Yellow
            'Hard': '#ff8800',    // Orange
            'Expert': '#ff0000'   // Red
        };
        
        this.difficultyButton.setColor(difficultyColors[this.difficultyLevel] || '#ffffff');
        
        // Set global registry value
        this.game.registry.set('difficultyLevel', this.difficultyLevel);
    }

    goBack()
    {
        // Check if there's a saved game state to return to
        const savedGameState = this.game.registry.get('gameState');
        if (savedGameState) {
            this.scene.start('Game');
        } else {
            this.scene.start('MainMenu');
        }
    }
}
