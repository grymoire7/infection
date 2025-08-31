import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    animatedDots: any[] = [];
    dotTweens: Phaser.Tweens.Tween[] = [];

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        this.background = this.add.image(centerX, centerY, 'background');

        this.logo = this.add.image(centerX, centerY, 'logo').setDepth(100);
        
        // Scale logo based on screen size
        const logoScale = Math.min(1, this.cameras.main.width / 1024);
        this.logo.setScale(logoScale);

        const titleFontSize = Math.min(38, this.cameras.main.width / 20);
        this.title = this.add.text(centerX, centerY * 1.2, 'Infection!', {
            fontFamily: 'Arial Black', fontSize: titleFontSize, color: '#44ff44',
            stroke: '#005500', strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.createAnimatedDots();

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        if (this.logoTween)
        {
            this.logoTween.stop();
            this.logoTween = null;
        }

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
            dot.setDepth(50); // Behind logo (100) and title (100), in front of background
            
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
            const tween = this.tweens.addCounter({
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

    moveLogo (vueCallback: ({ x, y }: { x: number, y: number }) => void)
    {
        if (this.logoTween)
        {
            if (this.logoTween.isPlaying())
            {
                this.logoTween.pause();
            }
            else
            {
                this.logoTween.play();
            }
        } 
        else
        {
            this.logoTween = this.tweens.add({
                targets: this.logo,
                x: { value: 750, duration: 3000, ease: 'Back.easeInOut' },
                y: { value: 80, duration: 1500, ease: 'Sine.easeOut' },
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    if (vueCallback)
                    {
                        vueCallback({
                            x: Math.floor(this.logo.x),
                            y: Math.floor(this.logo.y)
                        });
                    }
                }
            });
        }
    }
}
