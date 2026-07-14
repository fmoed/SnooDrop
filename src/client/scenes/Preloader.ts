import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    // Center at (300, 400) for the 600x800 vertical canvas
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0a0b12);

    if (this.textures.exists('background')) {
      const bg = this.add.image(width / 2, height / 2, 'background').setAlpha(0.1);
      bg.setDisplaySize(width, height);
    }

    // A simple progress bar outline
    this.add.rectangle(width / 2, height / 2, 408, 32).setStrokeStyle(1, 0xffffff, 0.3);

    // The progress bar itself
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 4, 28, 0xffffff);

    // Use the progress event to update the bar width
    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 396 * progress;
    });
  }

  preload() {
    // Load immediately required low-tier sprites to speed up game boot
    this.load.setPath('../assets');

    this.load.image('logo', 'logo.png');

    for (let i = 1; i <= 5; i++) {
      this.load.image(`tier${i}`, `tier${i}.jpg`);
    }
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('MainMenu');
  }
}
