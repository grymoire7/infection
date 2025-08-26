import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    animatedDots: GameObjects.Circle[] = [];
    dotTweens: Phaser.Tweens.Tween[] = [];

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background');

        this.logo = this.add.image(512, 300, 'logo').setDepth(100);

        this.title = this.add.text(512, 460, 'Main Menu', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
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
        // Create 4 red dots and 4 blue dots
        const colors = [0xff0000, 0x0000ff]; // red, blue
        const dotRadius = 12; // Same size as game dots
        
        for (let i = 0; i < 8; i++) {
            const color = colors[i % 2]; // Alternate between red and blue
            
            // Create dot with stroke like in the game
            const dot = this.add.circle(0, 0, dotRadius, color);
            dot.setStrokeStyle(2, 0x000000);
            dot.setDepth(50); // Behind logo (100) and title (100), in front of background
            
            this.animatedDots.push(dot);
            
            // Set up circular movement parameters
            const centerX = 512;
            const centerY = 384;
            const radius = Phaser.Math.Between(100, 200);
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
