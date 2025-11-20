import { BaseScene } from '../BaseScene';
import { Logger } from '../ErrorLogger';

export class Preloader extends BaseScene
{
    private background: Phaser.GameObjects.Image;
    private progressBarOutline: Phaser.GameObjects.Rectangle;
    private progressBar: Phaser.GameObjects.Rectangle;

    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.background = this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.progressBarOutline = this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        this.progressBar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            this.progressBar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');
        this.load.image('star', 'star.png');
        this.load.audio('placement', 'placement.wav');
        this.load.audio('propagate', 'propagate.wav');
                                                                                                                                                                                        
        this.load.spritesheet('evil-sprite', 'animations/SlimeRed.png', { frameWidth: 16, frameHeight: 16 });                                                                                          
        this.load.spritesheet('good-sprite', 'animations/SlimeBlue.png', { frameWidth: 16, frameHeight: 16 });      
        this.load.spritesheet('blocked-sprite', 'animations/EarthA.png', { frameWidth: 16, frameHeight: 16 });      
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        // Create global animations that will be used across multiple scenes
        this.createGlobalAnimations();

        //  Move to the Splash. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Splash');
    }

    private createGlobalAnimations(): void {
        // Create dot pulse animations for use in Game and Splash scenes
        this.anims.create({
            key: 'good-dot-pulse',
            frames: this.anims.generateFrameNumbers('good-sprite', { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8] }),
            frameRate: 8,
            repeat: -1,
            repeatDelay: 2000
        });

        this.anims.create({
            key: 'evil-dot-pulse',
            frames: this.anims.generateFrameNumbers('evil-sprite', { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }),
            frameRate: 8,
            repeat: -1,
            repeatDelay: 2000
        });

        this.anims.create({
            key: 'blocked-pulse',
            frames: this.anims.generateFrameNumbers('blocked-sprite', { frames: [0, 1, 2, 3] }),
            frameRate: 2,
            repeat: -1,
            repeatDelay: 0
        });
    }

    public shutdown(): void {
        Logger.debug('Preloader: Starting shutdown cleanup');

        // Clean up display objects
        this.safeDestroy(this.background);
        this.safeDestroy(this.progressBarOutline);
        this.safeDestroy(this.progressBar);

        // Remove load event listeners
        this.load.off('progress');

        // Call parent shutdown for base cleanup
        super.shutdown();

        Logger.debug('Preloader: Shutdown cleanup completed');
    }
}