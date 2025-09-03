import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class About extends Scene
{
    background: GameObjects.Image;
    title: GameObjects.Text;
    backButton: GameObjects.Text;
    htmlElement: HTMLDivElement | null = null;

    constructor ()
    {
        super('About');
    }

    create ()
    {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        this.background = this.add.image(centerX, centerY, 'background');
        this.background.setAlpha(0.3);

        const titleFontSize = Math.min(48, this.cameras.main.width / 15);
        this.title = this.add.text(centerX, 50, 'About Infection!', {
            fontFamily: 'Arial Black', 
            fontSize: titleFontSize, 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        // Create back button
        const buttonFontSize = Math.min(24, this.cameras.main.width / 30);
        this.backButton = this.add.text(50, 50, 'Back', {
            fontFamily: 'Arial', 
            fontSize: buttonFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 15, y: 8 }
        }).setOrigin(0, 0.5);

        this.backButton.setInteractive();
        this.backButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        this.backButton.on('pointerover', () => {
            this.backButton.setBackgroundColor('#888888');
        });

        this.backButton.on('pointerout', () => {
            this.backButton.setBackgroundColor('#666666');
        });

        this.createScrollableContent();

        EventBus.emit('current-scene-ready', this);
    }

    createScrollableContent()
    {
        // Create HTML element for scrollable content
        this.htmlElement = document.createElement('div');
        this.htmlElement.style.position = 'absolute';
        this.htmlElement.style.left = '5%';
        this.htmlElement.style.top = '120px';
        this.htmlElement.style.width = '90%';
        this.htmlElement.style.maxWidth = '800px';
        
        // Calculate safe height that won't extend beyond viewport
        const gameContainer = document.getElementById('game-container');
        const containerHeight = gameContainer ? gameContainer.clientHeight : window.innerHeight;
        const safeHeight = Math.min(
            this.cameras.main.height - 200,
            containerHeight - 200,
            window.innerHeight - 200
        );
        
        this.htmlElement.style.height = `${safeHeight}px`;
        this.htmlElement.style.maxHeight = '60vh';
        this.htmlElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.htmlElement.style.color = '#ffffff';
        this.htmlElement.style.fontFamily = 'Arial, sans-serif';
        this.htmlElement.style.fontSize = Math.min(16, window.innerWidth / 50) + 'px';
        this.htmlElement.style.padding = Math.min(15, window.innerWidth / 50) + 'px';
        this.htmlElement.style.borderRadius = '10px';
        this.htmlElement.style.border = '2px solid #666666';
        this.htmlElement.style.overflowY = 'auto';
        this.htmlElement.style.boxSizing = 'border-box';
        this.htmlElement.style.zIndex = '1000';
        this.htmlElement.style.margin = '0 auto';
        this.htmlElement.style.right = '5%';

        this.htmlElement.innerHTML = `
            <h2 style="color: #44ff44; margin-top: 0;">Welcome to Infection!</h2>
            
            <p>Infection is a strategic grid-based game where you compete
                against an AI opponent to control the board through chain
                reactions and tactical placement.
            </p>
            
            <h3 style="color: #44ff44;">How to Play</h3>
            <ul>
                <li><strong>Objective:</strong> Control all cells on the grid</li>
                <li><strong>Placement:</strong> Click on empty cells or cells you own to add dots</li>
                <li><strong>Capacity:</strong> Each cell has a capacity based on its number of neighbors (2-4)</li>
                <li><strong>Explosions:</strong> When a cell exceeds its capacity, it explodes and infects adjacent cells</li>
                <li><strong>Chain Reactions:</strong> Explosions can trigger more explosions, creating powerful combos</li>
                <li><strong>Victory:</strong> Win by owning all non-blocked cells on the board</li>
            </ul>
            
            <h3 style="color: #44ff44;">Strategy Tips</h3>
            <ul>
                <li><strong>Corner Control:</strong> Corner cells have low capacity (2) and are easier to fill</li>
                <li><strong>Edge Advantage:</strong> Edge cells have medium capacity (3) and good strategic value</li>
                <li><strong>Center Power:</strong> Center cells have high capacity (4) but can create big chain reactions</li>
                <li><strong>Defensive Play:</strong> Sometimes it's better to block opponent moves than to expand</li>
                <li><strong>Chain Planning:</strong> Look for opportunities to create cascading explosions</li>
                <li><strong>Timing:</strong> Know when to trigger explosions for maximum impact</li>
            </ul>
            
            <h3 style="color: #44ff44;">Credits</h3>
            <p> Infection was originally inspired by a game I saw once that was very
                similar to <a style="color: #aaaaff" href="https://apps.kde.org/kjumpingcube/" target="_blank" >KJumpingcubes</a>, a classic
                chain reaction game. It was developed by Tracy Atteberry using Phaser 3,
                TypeScript, and often Aider.
            </p>
            
            <p style="margin-top: 40px; text-align: center; color: #888888;">
                <em>Thank you for playing Infection! May the best strategist win!</em>
            </p>
        `;

        // Add to DOM
        document.body.appendChild(this.htmlElement);

        // Add resize listener to make it responsive
        const resizeHandler = () => {
            if (this.htmlElement) {
                const gameContainer = document.getElementById('game-container');
                const containerHeight = gameContainer ? gameContainer.clientHeight : window.innerHeight;
                const safeHeight = Math.min(
                    this.cameras.main.height - 200,
                    containerHeight - 200,
                    window.innerHeight - 200
                );
                
                this.htmlElement.style.height = `${safeHeight}px`;
                this.htmlElement.style.maxHeight = '60vh';
                this.htmlElement.style.fontSize = Math.min(16, window.innerWidth / 50) + 'px';
                this.htmlElement.style.padding = Math.min(15, window.innerWidth / 50) + 'px';
            }
        };

        window.addEventListener('resize', resizeHandler);

        // Clean up HTML element when scene shuts down or is destroyed
        this.events.on('shutdown', () => {
            window.removeEventListener('resize', resizeHandler);
            if (this.htmlElement && this.htmlElement.parentNode) {
                this.htmlElement.parentNode.removeChild(this.htmlElement);
                this.htmlElement = null;
            }
        });

        this.events.on('destroy', () => {
            window.removeEventListener('resize', resizeHandler);
            if (this.htmlElement && this.htmlElement.parentNode) {
                this.htmlElement.parentNode.removeChild(this.htmlElement);
                this.htmlElement = null;
            }
        });
    }
}
