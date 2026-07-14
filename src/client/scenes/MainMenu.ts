import Phaser, { Scene, GameObjects } from 'phaser';

export class MainMenu extends Scene {
  background: GameObjects.Image | null = null;
  logo: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  subtitle: GameObjects.Text | null = null;
  startButton: GameObjects.Container | null = null;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    this.background = null;
    this.logo = null;
    this.title = null;
    this.subtitle = null;
    this.startButton = null;
  }

  create() {
    // Background load the remaining high-tier assets while the player is on the menu
    this.load.setPath('../assets');
    for (let i = 6; i <= 11; i++) {
      this.load.image(`tier${i}`, `tier${i}.jpg`);
    }
    this.load.image('tier12', 'tier13.jpg');
    this.load.start();

    this.refreshLayout();

    this.scale.on('resize', this.refreshLayout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.refreshLayout, this);
    });
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;

    this.cameras.resize(width, height);
    this.cameras.main.setBackgroundColor(0x0a0b12);

    // Dotted pattern grid
    this.add.grid(width / 2, height / 2, width, height, 40, 40, 0xffffff, 0.015, 0xffffff, 0.03);

    // Title text
    if (!this.title) {
      this.title = this.add
        .text(width / 2, height * 0.35, 'SnooDrop', {
          fontFamily: 'Arial Black',
          fontSize: '52px',
          color: '#ff4500',
          stroke: '#000000',
          strokeThickness: 10,
          align: 'center',
        })
        .setOrigin(0.5);
        
      this.tweens.add({
        targets: this.title,
        scale: 1.05,
        yoyo: true,
        repeat: -1,
        duration: 800,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.title.setPosition(width / 2, height * 0.35);
    }

    // Subtitle / instructions
    if (!this.subtitle) {
      this.subtitle = this.add
        .text(width / 2, height * 0.6, 'Tap to Drop & Merge!\nReach the Legendary Trophy 👑', {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '18px',
          color: '#ffd700',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center',
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: this.subtitle,
        alpha: { start: 1, end: 0.4 },
        yoyo: true,
        repeat: -1,
        duration: 1000
      });
    } else {
      this.subtitle.setPosition(width / 2, height * 0.6);
    }

    // Background overlay image if loaded
    if (this.textures.exists('background')) {
      if (!this.background) {
        this.background = this.add.image(width / 2, height / 2, 'background').setAlpha(0.08);
      }
      this.background.setPosition(width / 2, height / 2);
      this.background.setDisplaySize(width, height);
    }

    // Start Button Container
    if (this.startButton) {
      this.startButton.destroy();
    }

    const btnWidth = 240;
    const btnHeight = 60;
    const btnX = width / 2;
    const btnY = height * 0.75;

    const btnContainer = this.add.container(btnX, btnY);
    this.startButton = btnContainer;

    const btnBg = this.add.graphics();
    // Beautiful Reddit-Orange button
    btnBg.fillStyle(0xff4500, 1);
    btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    btnBg.lineStyle(2.5, 0xffffff, 0.4);
    btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    btnContainer.add(btnBg);

    // Text Label
    const btnText = this.add.text(0, 0, 'START GAME', {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    btnContainer.add(btnText);

    // Hit area for interaction
    const hitArea = new Phaser.Geom.Rectangle(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    btnContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    // Hover/Touch Interactions
    btnContainer.on('pointerover', () => {
      this.tweens.add({
        targets: btnContainer,
        scale: 1.05,
        duration: 120,
        ease: 'Back.easeOut'
      });
    });

    btnContainer.on('pointerout', () => {
      this.tweens.add({
        targets: btnContainer,
        scale: 1.0,
        duration: 120,
        ease: 'Power1'
      });
    });

    btnContainer.on('pointerdown', () => {
      this.tweens.add({
        targets: btnContainer,
        scale: 0.95,
        duration: 80,
        yoyo: true,
        ease: 'Power1',
        onComplete: () => {
          this.scene.start('Game');
        }
      });
    });
  }
}
