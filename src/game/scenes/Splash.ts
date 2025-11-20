import { GameObjects } from 'phaser';
import { EventBus } from '../EventBus';
import { BaseScene } from '../BaseScene';
import { Logger } from '../ErrorLogger';

export class Splash extends BaseScene
{
    background: GameObjects.Image;
    title: GameObjects.Text;
    subtitle: GameObjects.Text;
    animatedDots: any[] = [];
    dotTweens: Phaser.Tweens.Tween[] = [];

    constructor ()
    {
        super('Splash');
    }

    create ()
    {
        Logger.debug('[Splash] ===== SCENE CREATE START =====');
        Logger.info('[Splash] Creating splash screen with animations');
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        this.background = this.add.image(centerX, centerY, 'background');


        const titleFontSize = Math.min(84, this.cameras.main.width * .5);
        this.title = this.add.text(centerX, centerY * .9, 'Infection!', {
            fontFamily: 'Arial Black', fontSize: titleFontSize, color: '#44ff44',
            stroke: '#005500', strokeThickness: 10,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        const subtitleFontSize = Math.min(24, this.cameras.main.width * .25);
        this.subtitle = this.add.text(centerX, centerY * 1.1, 'Germs vs White Cells', {
            fontFamily: 'Arial Black', fontSize: subtitleFontSize, color: '#44ff44',
            stroke: '#005500', strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.createAnimatedDots();

        Logger.debug('[Splash] ===== SCENE CREATE END =====');
        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        this.stopAnimatedDots();
        this.scene.start('Game');
    }

    createAnimatedDots()
    {
        // Create 4 evil dots and 4 good dots
        const spriteKeys = ['evil-sprite', 'good-sprite', 'blocked-sprite'];
        const animationKeys = ['evil-dot-pulse', 'good-dot-pulse', 'blocked-pulse'];
        
        for (let i = 0; i < 8; i++) {
            const spriteIndex = i % spriteKeys.length; // Alternate between sprites
            
            // Create animated sprite instead of circle
            const dot = this.add.sprite(0, 0, spriteKeys[spriteIndex]);
            dot.setScale(2); // Bigger scale than in Game.ts
            if (Math.random() < 0.5) {
                dot.toggleFlipX(); // Randomly flip for variety
            }
            dot.play(animationKeys[spriteIndex]);
            dot.setDepth(50); // Behind title (100), in front of background
            
            this.animatedDots.push(dot);
            
            // Set up responsive circular movement parameters
            const centerX = this.cameras.main.width / 2;
            const centerY = this.cameras.main.height / 2;
            const maxRadius = Math.min(this.cameras.main.width, this.cameras.main.height) * 0.25;
            const minRadius = maxRadius * 0.5;
            const radius = Phaser.Math.Between(minRadius, maxRadius);
            const speed = Phaser.Math.Between(4000, 8000); // Duration for full circle
            const startAngle = Phaser.Math.Between(0, 360);
            
            // Set initial position based on start angle
            const startAngleRad = Phaser.Math.DegToRad(startAngle);
            dot.x = centerX + Math.cos(startAngleRad) * radius;
            dot.y = centerY + Math.sin(startAngleRad) * radius;
            
            // Store animation data on the dot
            dot.setData('centerX', centerX);
            dot.setData('centerY', centerY);
            dot.setData('radius', radius);
            dot.setData('currentAngle', startAngle);
            
            // Create circular movement tween using a custom property
            const tween = (this.tweens as Phaser.Tweens.TweenManager).addCounter({
                from: 0,
                to: 360,
                duration: speed,
                ease: 'Linear',
                repeat: -1,
                onUpdate: (tween) => {
                    const currentAngle = dot.getData('currentAngle') + tween.getValue();
                    const angleRad = Phaser.Math.DegToRad(currentAngle);
                    dot.x = dot.getData('centerX') + Math.cos(angleRad) * dot.getData('radius');
                    dot.y = dot.getData('centerY') + Math.sin(angleRad) * dot.getData('radius');
                }
            });

            // Register tween with BaseScene for automatic cleanup
            this.addTween(tween);
            this.dotTweens.push(tween);
        }
    }

    stopAnimatedDots()
    {
        // Stop all dot tweens
        this.dotTweens.forEach(tween => {
            if (tween) {
                tween.stop();
            }
        });
        this.dotTweens = [];

        // Remove all animated dots
        this.animatedDots.forEach(dot => {
            if (dot) {
                dot.destroy();
            }
        });
        this.animatedDots = [];
    }

    public shutdown(): void {
        Logger.debug('Splash: Starting shutdown cleanup');

        // Clean up display objects
        this.safeDestroy(this.background);
        this.safeDestroy(this.title);
        this.safeDestroy(this.subtitle);

        // Clean up animated dots
        this.stopAnimatedDots();

        // Call parent shutdown for base cleanup
        super.shutdown();

        Logger.debug('Splash: Shutdown cleanup completed');
    }
}
