import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { InitResponse, ScoreResponse, LeaderboardEntry, AwardFlairResponse } from '../../shared/api';
import { SoundSynth } from './SoundSynth';

interface TierConfig {
  tier: number;
  radius: number;
  score: number;
  colorStr: string;
  name: string;
  emoji: string;
  shape: 'circle' | 'capsule' | 'rectangle' | 'hexagon';
}

const TIERS: TierConfig[] = [
  { tier: 1, radius: 16, score: 2, colorStr: '#ff4500', name: 'Upvote', emoji: '▲', shape: 'circle' },
  { tier: 2, radius: 18, score: 6, colorStr: '#5f99cf', name: 'Comment', emoji: '💬', shape: 'circle' },
  { tier: 3, radius: 22, score: 12, colorStr: '#ffd700', name: 'Post', emoji: '📄', shape: 'circle' },
  { tier: 4, radius: 25, score: 20, colorStr: '#228b22', name: 'Image', emoji: '🖼️', shape: 'circle' },
  { tier: 5, radius: 29, score: 30, colorStr: '#9370db', name: 'Link', emoji: '🔗', shape: 'circle' },
  { tier: 6, radius: 34, score: 42, colorStr: '#ff8c00', name: 'Video', emoji: '🎥', shape: 'circle' },
  { tier: 7, radius: 39, score: 56, colorStr: '#c0c0c0', name: 'Silver Award', emoji: '🥈', shape: 'circle' },
  { tier: 8, radius: 45, score: 72, colorStr: '#d4af37', name: 'Gold Award', emoji: '🥇', shape: 'circle' },
  { tier: 9, radius: 53, score: 90, colorStr: '#00bfff', name: 'Platinum Award', emoji: '💎', shape: 'circle' },
  { tier: 10, radius: 62, score: 110, colorStr: '#ff69b4', name: 'Snoo Head', emoji: '🤖', shape: 'circle' },
  { tier: 11, radius: 71, score: 135, colorStr: '#00ffff', name: 'Subreddit Logo', emoji: '🪐', shape: 'circle' },
  { tier: 12, radius: 83, score: 250, colorStr: '#e5e4e2', name: 'Cosmic Reddit Master', emoji: '🌌', shape: 'circle' }
];

const CUSTOM_VERTICES: Record<number, string> = {
  1: "168,184,185,153,182,121,156,85,129,39,95,85,71,114,69,159,90,189,108,199,145,199",
  2: "131,37,154,74,182,125,178,167,159,191,129,201,93,191,71,156,73,118,98,74",
  3: "120,36,185,27,195,26,230,132,206,189,152,217,108,231,80,225,59,194,39,179,25,151,42,103,48,80,57,65",
  5: "97,53,155,53,200,93,203,155,161,202,98,201,54,162,53,96",
  9: "63,223,73,111,85,87,99,93,118,63,185,30,186,101,182,116,191,113,160,187"
};

// Exact radius of the item inside the 256x256 image map (for 100% accurate scaling)
const IMAGE_RADII: Record<number, number> = {
  1: 58, 
  2: 55.5,
  3: 102.5,
  4: 115,  
  5: 75,
  6: 80,   
  7: 93,   
  8: 101,  
  9: 64,
  10: 122, 
  11: 115, 
  12: 104  
};

export class Game extends Scene {
  private score: number = 0;
  private highScore: number = 0;
  private username: string = 'anonymous';
  private subredditName: string = 'Programmers';
  private dailySeed: number = 0;
  private dropSequence: number[] = [];
  private sequenceIndex: number = 0;
  private activeRaids: string[] = [];

  // Layout & Container Dimensions
  private containerWidth: number = 440; // Wider curve
  private containerHeight: number = 540;
  private containerTop: number = 170;
  private containerBottom: number = 170 + 540; // 710
  private dropperY: number = 135;

  private lastCenterX: number | null = null;
  private lastContainerBottom: number | null = null;
  private gridBg: Phaser.GameObjects.Grid | null = null;

  // Physical walls
  // eslint-disable-next-line no-undef
  private curvedWalls: MatterJS.BodyType[] = [];

  // Responsive UI objects
  private sidebarLeftBg: Phaser.GameObjects.Graphics | null = null;
  private sidebarRightBg: Phaser.GameObjects.Graphics | null = null;
  private headerBg: Phaser.GameObjects.Graphics | null = null;
  private leaderboardContainer: Phaser.GameObjects.Container | null = null;
  private badgesContainer: Phaser.GameObjects.Container | null = null;
  private trackerContainer: Phaser.GameObjects.Container | null = null;
  private trackerSprites: Phaser.GameObjects.Sprite[] = [];
  private trackerQTexts: (Phaser.GameObjects.Text | null)[] = [];
  private unlockedTiers: boolean[] = [true, true, true, true, false, false, false, false, false, false, false, false];
  private top10Streak: number = 0;
  private isDesktop: boolean = false;
  private unlockedBadges: string[] = [];
  private activeItems: Phaser.GameObjects.Sprite[] = [];
  private muteButton: Phaser.GameObjects.Text | null = null;
  private mouseHasMoved: boolean = false;
  private lastMoveX: number = 0;

  private nextDropTitle: Phaser.GameObjects.Text | null = null;
  private progressTrackerTitle: Phaser.GameObjects.Text | null = null;
  private streakText: Phaser.GameObjects.Text | null = null;
  private helpText: Phaser.GameObjects.Text | null = null;
  private mobileNextDropLabel: Phaser.GameObjects.Text | null = null;

  // Physics & Game Loop
  private dropCooldown: boolean = false;
  private currentPreviewItem: Phaser.GameObjects.Sprite | null = null;
  private guideLine: Phaser.GameObjects.Graphics | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private highScoreText: Phaser.GameObjects.Text | null = null;
  private usernameText: Phaser.GameObjects.Text | null = null;
  private dailySeedText: Phaser.GameObjects.Text | null = null;
  private subredditTitleText: Phaser.GameObjects.Text | null = null;
  private nextItemIcon: Phaser.GameObjects.Sprite | null = null;
  private containerGraphics: Phaser.GameObjects.Graphics | null = null;
  
  // Game Over tracking
  private gameOverLineY: number = 210;
  private dangerTimer: number = 0;
  private warningLine: Phaser.GameObjects.Graphics | null = null;
  private isGameOver: boolean = false;

  // Merging queue
  private mergedIds: Set<number> = new Set();
  private mergeQueue: { goA: Phaser.GameObjects.Sprite; goB: Phaser.GameObjects.Sprite; tier: number }[] = [];

  constructor() {
    super('Game');
  }

  init() {
    this.score = 0;
    this.sequenceIndex = 0;
    this.mergedIds.clear();
    this.mergeQueue = [];
    this.isGameOver = false;
    this.dangerTimer = 0;
    this.dropCooldown = false;
    this.lastCenterX = null;
    this.lastContainerBottom = null;

    // Reset physics walls
    this.curvedWalls = [];

    // Reset Graphics & UI objects to prevent leaking old instances
    this.containerGraphics = null;
    this.warningLine = null;
    this.guideLine = null;
    this.sidebarLeftBg = null;
    this.sidebarRightBg = null;
    this.headerBg = null;
    this.leaderboardContainer = null;
    this.trackerContainer = null;
    this.trackerSprites = [];
    this.activeItems = [];
    this.nextItemIcon = null;
    this.currentPreviewItem = null;
    this.gridBg = null;

    this.nextDropTitle = null;
    this.progressTrackerTitle = null;
    this.helpText = null;
    this.mobileNextDropLabel = null;

    // Load unlocked elements state from LocalStorage
    try {
      const unlockedRaw = localStorage.getItem('snoodrop_unlocked_elements');
      if (unlockedRaw) {
        this.unlockedTiers = JSON.parse(unlockedRaw);
        // Force the first 4 basic elements to always show as unlocked
        for (let i = 0; i < 4; i++) {
          this.unlockedTiers[i] = true;
        }
      } else {
        this.unlockedTiers = [true, true, true, true, false, false, false, false, false, false, false, false];
        localStorage.setItem('snoodrop_unlocked_elements', JSON.stringify(this.unlockedTiers));
      }
    } catch (e) {
      this.unlockedTiers = [true, true, true, true, false, false, false, false, false, false, false, false];
    }
  }

  private mergeUnlockedTiers(a: boolean[], b: boolean[]): boolean[] {
    const len = Math.max(12, a.length, b.length);
    const out: boolean[] = [];
    for (let i = 0; i < len; i++) {
      out[i] = Boolean(a[i]) || Boolean(b[i]);
    }
    return out;
  }

  create() {
    const { width, height } = this.scale;

    // Set background
    this.cameras.main.setBackgroundColor(0x0a0b12);
    
    // Draw procedural grid background pattern
    this.gridBg = this.add.grid(width / 2, height / 2, width, height, 40, 40, 0xffffff, 0.02, 0xffffff, 0.04);
    this.gridBg.setDepth(0);

    // Setup physical boundaries (Matter.js)
    this.matter.world.setBounds(0, 0, width, height, 32, true, true, false, true);

    // Initial Layout & Boundaries setup
    this.layout();

    // Responsive scaling listener with proper shutdown hook to prevent memory leaks/freezes
    this.scale.on('resize', this.handleResize, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.handleResize, this);
    });

    // Fetch Init Data (Seed, Sequence, Username, Leaderboards)
    this.fetchInitData();

    // Input Events
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) {
        this.movePreview(pointer.x);
      } else {
        if (Math.abs(pointer.x - this.lastMoveX) > 5) {
          this.mouseHasMoved = true;
          this.movePreview(pointer.x);
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isGameOver && this.currentPreviewItem) {
        if (pointer.wasTouch || this.mouseHasMoved) {
          this.dropItem(this.currentPreviewItem.x);
        } else {
          this.dropItem(this.scale.width / 2);
        }
      }
    });

    // Merge Collision Event Listener
    this.matter.world.on('collisionstart', (event: { pairs: Phaser.Types.Physics.Matter.MatterCollisionPair[] }) => {
      event.pairs.forEach((pair: Phaser.Types.Physics.Matter.MatterCollisionPair) => {
        // Use parent bodies in case of complex polygon bodies
        const bodyA = pair.bodyA.parent || pair.bodyA;
        const bodyB = pair.bodyB.parent || pair.bodyB;

        const speedA = bodyA.speed || 0;
        const speedB = bodyB.speed || 0;
        const impactSpeed = Math.max(speedA, speedB);

        if (impactSpeed > 1.2) {
          if (bodyA.gameObject && bodyA.gameObject.getData('tier') !== undefined) {
            this.applyJellyBounce(bodyA.gameObject as Phaser.GameObjects.Sprite, impactSpeed);
          }
          if (bodyB.gameObject && bodyB.gameObject.getData('tier') !== undefined) {
            this.applyJellyBounce(bodyB.gameObject as Phaser.GameObjects.Sprite, impactSpeed);
          }
        }

        if (bodyA.gameObject && bodyB.gameObject) {
          const goA = bodyA.gameObject as Phaser.GameObjects.Sprite;
          const goB = bodyB.gameObject as Phaser.GameObjects.Sprite;
          const tierA = goA.getData('tier') as number;
          const tierB = goB.getData('tier') as number;

          // Merge if same tier and not already cosmic master (tier 12)
          if (tierA && tierB && tierA === tierB && tierA < 12) {
            const idA = bodyA.id;
            const idB = bodyB.id;
            if (!this.mergedIds.has(idA) && !this.mergedIds.has(idB)) {
              this.mergedIds.add(idA);
              this.mergedIds.add(idB);
              this.mergeQueue.push({ goA, goB, tier: tierA });
            }
          }
        }
      });
    });
  }

  override update(_time: number, delta: number) {
    if (this.isGameOver) return;

    // 1. Process deferred merges to prevent Matter.js collision bugs
    this.processMergeQueue();

    // Sync normal sprites with their Matter bodies manually
    this.activeItems = this.activeItems.filter(item => {
      if (!item.active) return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = item.getData('body') as any;
      if (body) {
        item.x = body.position.x;
        item.y = body.position.y;
        const tier = item.getData('tier') as number;
        if (tier === 5) {
          item.rotation = body.angle - (Math.PI / 6);
        } else {
          item.rotation = body.angle;
        }
      }
      return true;
    });

    // 2. Check for game-over / overflow condition
    this.checkOverflow(delta);
    
    // 3. Keep current preview piece at the top
    if (this.currentPreviewItem) {
      this.currentPreviewItem.y = this.dropperY;
      this.drawGuideLine();
    }
  }

  private handleResize() {
    const { width, height } = this.scale;
    
    if (this.gridBg) {
      this.gridBg.destroy();
    }
    this.gridBg = this.add.grid(width / 2, height / 2, width, height, 40, 40, 0xffffff, 0.02, 0xffffff, 0.04);
    this.gridBg.setDepth(0);

    this.matter.world.setBounds(0, 0, width, height, 32, true, true, false, true);
    this.layout();
  }

  private layout() {
    const { width, height } = this.scale;
    const isDesktop = width >= 720;
    this.isDesktop = isDesktop;
    const centerX = width / 2;

    // 1. Calculate dynamic container size based on screen dimensions
    if (isDesktop) {
      const sidebarWidth = Math.min(280, width * 0.25);
      const maxH = height - 120; // 60px padding top/bottom
      this.containerHeight = Math.min(600, Math.max(350, maxH));
      this.containerWidth = Math.min(590, this.containerHeight * 0.95);
      
      // Ensure we leave room for the sidebars and margins
      if (this.containerWidth > width - sidebarWidth * 2 - 60) {
        this.containerWidth = Math.max(300, width - sidebarWidth * 2 - 60);
        this.containerHeight = this.containerWidth / 0.95;
      } else {
        // Enforce wider container logic when space is available
        this.containerWidth = this.containerHeight * 0.95;
      }
    } else {
      // Mobile
      const maxH = height - 180; // leave space for mobile header (100px) and tracker (60px)
      this.containerHeight = Math.min(500, Math.max(300, maxH));
      this.containerWidth = Math.min(440, this.containerHeight * 0.95);
      
      if (this.containerWidth > width - 40) {
        this.containerWidth = Math.max(250, width - 40);
        this.containerHeight = this.containerWidth / 0.95;
      }
    }

    const centerY = height / 2 + 10;
    this.containerTop = centerY - this.containerHeight / 2;
    this.containerBottom = centerY + this.containerHeight / 2;
    this.gameOverLineY = this.containerTop + 40;
    this.dropperY = this.containerTop - 35;

    // 2. Shift active physical items relative to container bounds if centerX or containerBottom changed
    if (this.lastCenterX !== null && this.lastContainerBottom !== null) {
      const dx = centerX - this.lastCenterX;
      const dy = this.containerBottom - this.lastContainerBottom;

      if (dx !== 0 || dy !== 0) {
        this.children.each((child) => {
          if (child.active && child.getData('tier') !== undefined) {
            const sprite = child as Phaser.GameObjects.Sprite;
            const body = sprite.getData('body');
            if (body) {
              this.matter.body.setPosition(body, { x: body.position.x + dx, y: body.position.y + dy });
            }
          }
        });
        
        // Relocate current preview item
        if (this.currentPreviewItem && this.currentPreviewItem.active) {
          this.currentPreviewItem.x += dx;
          this.currentPreviewItem.y = this.dropperY;
        }
      }
    }
    
    this.lastCenterX = centerX;
    this.lastContainerBottom = this.containerBottom;

    // 3. Draw Visual Curved Container
    if (!this.containerGraphics) {
      this.containerGraphics = this.add.graphics();
    }
    this.containerGraphics.clear();
    
    // Glow effect for U-shaped container
    const glowTints = [
      { width: 14, color: 0x00ffcc, alpha: 0.08 },
      { width: 8, color: 0x00ffcc, alpha: 0.2 },
      { width: 3, color: 0xffffff, alpha: 0.85 }
    ];

    glowTints.forEach(glow => {
      this.containerGraphics!.lineStyle(glow.width, glow.color, glow.alpha);
      this.containerGraphics!.beginPath();
      
      const numSegments = 50;
      const halfW = this.containerWidth / 2;
      for (let i = 0; i <= numSegments; i++) {
        const dx = -halfW + (i / numSegments) * this.containerWidth;
        const dy = this.containerHeight * Math.pow(dx / halfW, 4);
        const px = centerX + dx;
        const py = this.containerBottom - dy;
        if (i === 0) {
          this.containerGraphics!.moveTo(px, py);
        } else {
          this.containerGraphics!.lineTo(px, py);
        }
      }
      this.containerGraphics!.strokePath();
    });

    // 4. Physical Boundaries (Always destroy and recreate to match dynamic dimensions perfectly!)
    if (this.curvedWalls && this.curvedWalls.length > 0) {
      this.curvedWalls.forEach(wall => this.matter.world.remove(wall));
      this.curvedWalls = [];
    }

    const numSegments = 40;
    const halfW = this.containerWidth / 2;
    let prevX = centerX - halfW;
    let prevY = this.containerBottom - this.containerHeight;

    for (let i = 1; i <= numSegments; i++) {
      const dx = -halfW + (i / numSegments) * this.containerWidth;
      const dy = this.containerHeight * Math.pow(dx / halfW, 4);
      const px = centerX + dx;
      const py = this.containerBottom - dy;

      const midX = (prevX + px) / 2;
      const midY = (prevY + py) / 2;
      const len = Math.sqrt((px - prevX) * (px - prevX) + (py - prevY) * (py - prevY));
      const angle = Math.atan2(py - prevY, px - prevX);

      // Create static curved wall segment (add 2px to prevent gaps)
      const segment = this.matter.add.rectangle(midX, midY, len + 2, 16, { 
        isStatic: true, 
        friction: 0.1,
        restitution: 0.1
      });
      this.matter.body.setAngle(segment, angle);
      this.curvedWalls.push(segment);

      prevX = px;
      prevY = py;
    }

    // 5. Danger warning line
    if (!this.warningLine) {
      this.warningLine = this.add.graphics();
    }
    this.warningLine.clear();
    this.warningLine.lineStyle(2, 0xff3333, 0.4);
    const warningWidth = halfW * Math.pow((this.containerHeight - 40) / this.containerHeight, 0.25);
    this.warningLine.lineBetween(centerX - warningWidth, this.gameOverLineY, centerX + warningWidth, this.gameOverLineY);

    // 6. Destroy existing UI components to redraw
    this.destroyUIElements();

    // 7. Check desktop vs mobile viewports
    if (isDesktop) {
      this.layoutDesktop(width, height, centerX, centerY, this.containerTop, this.containerBottom);
    } else {
      this.layoutMobile(width, height, centerX, centerY, this.containerTop, this.containerBottom);
    }
  }

  private destroyUIElements() {
    this.sidebarLeftBg?.destroy(); this.sidebarLeftBg = null;
    this.sidebarRightBg?.destroy(); this.sidebarRightBg = null;
    this.headerBg?.destroy(); this.headerBg = null;
    this.scoreText?.destroy(); this.scoreText = null;
    this.highScoreText?.destroy(); this.highScoreText = null;
    this.usernameText?.destroy(); this.usernameText = null;
    this.streakText?.destroy(); this.streakText = null;
    this.dailySeedText?.destroy(); this.dailySeedText = null;
    this.subredditTitleText?.destroy(); this.subredditTitleText = null;
    this.nextItemIcon?.destroy(); this.nextItemIcon = null;

    this.nextDropTitle?.destroy(); this.nextDropTitle = null;
    this.progressTrackerTitle?.destroy(); this.progressTrackerTitle = null;
    this.helpText?.destroy(); this.helpText = null;
    this.mobileNextDropLabel?.destroy(); this.mobileNextDropLabel = null;
    this.muteButton?.destroy(); this.muteButton = null;

    this.trackerSprites.forEach(s => s.destroy());
    this.trackerSprites = [];
    this.trackerQTexts.forEach(t => t?.destroy());
    this.trackerQTexts = [];

    if (this.leaderboardContainer) { this.leaderboardContainer.destroy(); this.leaderboardContainer = null; }
    if (this.badgesContainer) { this.badgesContainer.destroy(); this.badgesContainer = null; }
    if (this.trackerContainer) { this.trackerContainer.destroy(); this.trackerContainer = null; }

    const mbText = this.children.getByName('mobileBadgesText');
    if (mbText) mbText.destroy();
  }

  private layoutDesktop(_width: number, _height: number, centerX: number, _centerY: number, containerTop: number, _containerBottom: number) {
    const sidebarWidth = 190;
    const sidebarHeight = this.containerHeight;
    const sidebarY = containerTop;

    const leftX = centerX - this.containerWidth / 2 - 20 - sidebarWidth;
    const rightX = centerX + this.containerWidth / 2 + 20;

    // Left Panel Background
    this.sidebarLeftBg = this.add.graphics();
    this.sidebarLeftBg.fillStyle(0x131722, 0.85);
    this.sidebarLeftBg.fillRoundedRect(leftX, sidebarY, sidebarWidth, sidebarHeight, 8);
    this.sidebarLeftBg.lineStyle(1.5, 0xffffff, 0.08);
    this.sidebarLeftBg.strokeRoundedRect(leftX, sidebarY, sidebarWidth, sidebarHeight, 8);

    // Draw an inner HUD container card behind the player stats
    const hud = this.add.graphics();
    hud.fillStyle(0x0e111a, 0.7);
    hud.fillRoundedRect(leftX + 10, sidebarY + 60, sidebarWidth - 20, 135, 6);
    hud.lineStyle(1.2, 0xffffff, 0.05);
    hud.strokeRoundedRect(leftX + 10, sidebarY + 60, sidebarWidth - 20, 135, 6);

    // Right Panel Background
    this.sidebarRightBg = this.add.graphics();
    this.sidebarRightBg.fillStyle(0x131722, 0.85);
    this.sidebarRightBg.fillRoundedRect(rightX, sidebarY, sidebarWidth, sidebarHeight, 8);
    this.sidebarRightBg.lineStyle(1.5, 0xffffff, 0.08);
    this.sidebarRightBg.strokeRoundedRect(rightX, sidebarY, sidebarWidth, sidebarHeight, 8);

    this.subredditTitleText = this.add.text(leftX + sidebarWidth / 2, sidebarY + 18, `r/${this.subredditName}`, {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ff4500',
    }).setOrigin(0.5);

    this.muteButton = this.add.text(leftX + sidebarWidth - 22, sidebarY + 18, SoundSynth.getMuteState() ? '🔇' : '🔊', {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '18px'
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const isMuted = SoundSynth.toggleMute();
        this.muteButton?.setText(isMuted ? '🔇' : '🔊');
      });

    this.usernameText = this.add.text(leftX + sidebarWidth / 2, sidebarY + 38, `u/${this.username}`, {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '11px',
      color: '#8892b0',
    }).setOrigin(0.5);

    // Score Display
    this.add.text(leftX + 22, sidebarY + 70, '▲ UPVOTES', {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#8892b0'
    });

    this.scoreText = this.add.text(leftX + 22, sidebarY + 84, this.score.toLocaleString(), {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '28px',
      color: '#ff4500',
      fontStyle: 'bold'
    });

    this.highScoreText = this.add.text(leftX + 22, sidebarY + 120, `🏆 PB: ${this.highScore.toLocaleString()}`, {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '11px',
      color: '#ffd700',
      fontStyle: 'bold'
    });

    // Display daily streak
    this.streakText = this.add.text(leftX + 22, sidebarY + 144, this.top10Streak > 0 ? `🔥 STREAK: ${this.top10Streak} DAYS` : `🔥 STREAK: 0 DAYS`, {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '11px',
      color: this.top10Streak > 0 ? '#ff6a00' : '#717d93',
      fontStyle: 'bold'
    });

    // Daily Seed
    this.dailySeedText = this.add.text(leftX + 22, sidebarY + 168, `SEED: ${this.dailySeed}`, {
      fontFamily: 'Courier',
      fontSize: '10px',
      color: '#4caf50',
      fontStyle: 'bold'
    });

    // Local Daily Leaderboard Panel
    this.leaderboardContainer = this.add.container(leftX + 20, sidebarY + 215);
    const lTitle = this.add.text(0, 0, '🏆 DAILY LEADERBOARD', {
      fontFamily: 'Outfit',
      fontSize: '12px',
      color: '#00ffff',
      fontStyle: 'bold'
    });
    this.leaderboardContainer.add(lTitle);

    // Draw Legendary Badges Panel
    this.drawBadgesPanel(leftX + 20, sidebarY + sidebarHeight - 125, sidebarWidth - 40);

    // Right Sidebar content: Next Drop
    this.nextDropTitle = this.add.text(rightX + sidebarWidth / 2, sidebarY + 25, 'NEXT DROP', {
      fontFamily: 'Outfit',
      fontSize: '13px',
      color: '#a0aabf',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Progress Tracker
    this.progressTrackerTitle = this.add.text(rightX + sidebarWidth / 2, sidebarY + 150, 'PROGRESS TRACKER', {
      fontFamily: 'Outfit',
      fontSize: '13px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Tracker 2x6 grid layout for 12 elements
    const cols = 6;
    const startGridX = rightX + 30;
    const startGridY = sidebarY + 195;
    const spacingX = 26;
    const spacingY = 40;

    for (let i = 0; i < 12; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const px = startGridX + c * spacingX;
      const py = startGridY + r * spacingY;
      
      const isUnlocked = this.unlockedTiers[i];
      const tierConf = TIERS[i];
      const scale = 10 / (tierConf ? tierConf.radius : 20);
      const sprite = this.createItemSprite(px, py, i + 1, !isUnlocked, scale);
      sprite.setData('index', i);
      
      this.trackerSprites.push(sprite);
    }

    // Help box
    this.helpText = this.add.text(rightX + sidebarWidth / 2, sidebarY + 450, 'Drop & Merge items!\nMerge elements to reach\nCosmic Reddit Master\nfor Mythical User Flair! 🌌', {
      fontFamily: 'Outfit',
      fontSize: '11px',
      color: '#a0aabf',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5);
  }

  private layoutMobile(width: number, height: number, _centerX: number, _centerY: number, _containerTop: number, _containerBottom: number) {
    // Header Panel
    this.headerBg = this.add.graphics();
    this.headerBg.fillStyle(0x131722, 0.85);
    this.headerBg.fillRoundedRect(10, 10, width - 20, 100, 8);
    this.headerBg.lineStyle(1, 0xffffff, 0.08);
    this.headerBg.strokeRoundedRect(10, 10, width - 20, 100, 8);

    // Interactive Mute Toggle Button for mobile
    this.muteButton = this.add.text(width - 45, 80, SoundSynth.getMuteState() ? '🔇' : '🔊', {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '18px'
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const isMuted = SoundSynth.toggleMute();
        this.muteButton?.setText(isMuted ? '🔇' : '🔊');
      });

    // Score display
    this.scoreText = this.add.text(25, 20, `Score: ${this.score}`, {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold'
    });

    this.highScoreText = this.add.text(25, 50, `High Score: ${this.highScore}`, {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '13px',
      color: '#a0aabf',
    });

    this.usernameText = this.add.text(25, 70, `u/${this.username} ${this.top10Streak > 0 ? '🔥 ' + this.top10Streak : ''}`, {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '12px',
      color: '#ff8700',
    });

    this.dailySeedText = this.add.text(25, 87, `Daily Seed: ${this.dailySeed}`, {
      fontFamily: 'Courier',
      fontSize: '10px',
      color: '#4caf50',
    });

    // Subreddit title
    this.subredditTitleText = this.add.text(width / 2, 70, `r/${this.subredditName}`, {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ff4500',
    }).setOrigin(0.5);

    // Mobile badges display emojis below Subreddit title
    const badgeEmojis = this.unlockedBadges.map(b => b.split(' ')[0]).join(' ');
    if (badgeEmojis) {
      const badgeText = this.add.text(width / 2, 90, badgeEmojis, {
        fontFamily: 'Outfit',
        fontSize: '13px'
      }).setOrigin(0.5);
      badgeText.setName('mobileBadgesText');
    }

    // Next Drop Title
    this.mobileNextDropLabel = this.add.text(width - 130, 20, 'Next Drop:', {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '13px',
      color: '#a0aabf',
    });

    // Horizontal Progress Tracker at the very bottom
    const trackerSpacing = Math.min(26, (width - 45) / 12);
    const trackerStartX = width / 2 - (trackerSpacing * 11) / 2;
    const trackerY = height - 30;

    for (let i = 0; i < 12; i++) {
      const px = trackerStartX + i * trackerSpacing;
      const isUnlocked = this.unlockedTiers[i];
      const tierConf = TIERS[i];
      const scale = 10 / (tierConf ? tierConf.radius : 20);
      const sprite = this.createItemSprite(px, trackerY, i + 1, !isUnlocked, scale);
      sprite.setData('index', i);
      this.trackerSprites.push(sprite);
      
      let qText: Phaser.GameObjects.Text | null = null;
      if (!isUnlocked) {
        qText = this.add.text(px, trackerY, '?', {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);
      }
      this.trackerQTexts.push(qText);
    }
  }

  private updateProgressTracker() {
    for (let i = 0; i < 12; i++) {
      const isUnlocked = this.unlockedTiers[i];
      const sprite = this.trackerSprites[i];
      const qText = this.trackerQTexts[i];
      
      if (isUnlocked && sprite && sprite.getData('isLockedVisually')) {
        // Unlock it!
        sprite.setData('isLockedVisually', false);
        sprite.clearTint();
        sprite.setAlpha(1);
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        
        // Shiny unlock animation
        this.tweens.add({
          targets: sprite,
          scale: sprite.scaleX * 1.5,
          yoyo: true,
          duration: 300,
          ease: 'Sine.easeInOut'
        });
        
        if (qText) {
          qText.destroy();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.trackerQTexts[i] = null as any;
        }
      }
    }
  }

  private processMergeQueue() {
    if (this.mergeQueue.length > 0) {
      const { goA, goB, tier } = this.mergeQueue.shift()!;
      if (!goA.active || !goB.active) return;

      const midX = (goA.x + goB.x) / 2;
      const midY = (goA.y + goB.y) / 2;

      // Spawn particles
      this.spawnMergeParticles(midX, midY, tier);

      // Clean up old items and their physics bodies
      const bodyA = goA.getData('body');
      if (bodyA) this.matter.world.remove(bodyA);
      goA.destroy();

      const bodyB = goB.getData('body');
      if (bodyB) this.matter.world.remove(bodyB);
      goB.destroy();

      // Spawn next level item
      const nextTier = tier + 1;
      this.spawnMergedItem(midX, midY, nextTier);

      // Add score
      const tierConfig = TIERS[nextTier - 1];
      if (tierConfig) {
        this.score += tierConfig.score;
        if (this.isDesktop) {
          this.scoreText?.setText(this.score.toLocaleString());
        } else {
          this.scoreText?.setText(`Score: ${this.score}`);
        }

        // Floating Score text popup
        this.spawnScorePopup(midX, midY, `+${tierConfig.score}`);
      }

      // Check Progress Tracker Unlocks!
      if (!this.unlockedTiers[nextTier - 1]) {
        this.unlockedTiers[nextTier - 1] = true;
        
        // Save to LocalStorage
        try {
          localStorage.setItem('snoodrop_unlocked_elements', JSON.stringify(this.unlockedTiers));
        } catch (e) {
          // Ignore localStorage errors
        }

        // Update the UI instantly
        this.updateProgressTracker();
        
        const trackerSprite = this.trackerSprites[nextTier - 1];
          if (trackerSprite) {
            trackerSprite.setTexture(`tier${nextTier}`);
            const radius = tierConfig ? tierConfig.radius : 20;
            const baseScale = trackerSprite.getData('baseScale') || (10 / radius);
            this.tweens.add({
              targets: trackerSprite,
              scale: baseScale * 1.5,
              duration: 300,
              yoyo: true,
              ease: 'Quad.easeInOut',
              onComplete: () => {
                if (trackerSprite.active) {
                  trackerSprite.setScale(baseScale);
                }
              }
            });
            // Particles effect
            this.add.particles(trackerSprite.x, trackerSprite.y, `tier${nextTier}`, {
              speed: { min: 10, max: 40 },
              scale: { start: 0.15, end: 0 },
              lifespan: 300,
              quantity: 6,
              stopAfter: 6,
              blendMode: 'ADD'
            });
          }

        // Handle newly unlocked legendary badge
        if (nextTier >= 9) {
          const badgeNames = ['🥉 Veteran Merger', '🥈 Master Merger', '🥇 Legendary Merger', '🌌 Transcendent Master'];
          const badgeName = badgeNames[nextTier - 9];
          if (badgeName && !this.unlockedBadges.includes(badgeName)) {
            this.unlockedBadges.push(badgeName);
            if (this.badgesContainer) {
              this.drawBadgesPanel(this.badgesContainer.x, this.badgesContainer.y, 150);
            }
          }
        }

        // Only trigger visual popup banner for rare/higher tiers (tier 10 and above)
        if (nextTier >= 10) {
          this.triggerTierUnlock(nextTier);
        }
      }

      // Special legendary trophy explosion on the ultimate tier (Tier 12)
      if (nextTier === 12) {
        this.triggerLegendaryTrophy(midX, midY);
      }
    }
  }

  private triggerTierUnlock(tier: number) {
    const config = TIERS[tier - 1];
    if (!config) return;

    const { width, height } = this.scale;

    // Show floating unlock banner in center
    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(0x0e2b1b, 0.95);
    bannerBg.fillRoundedRect(width / 2 - 180, height / 2 - 80, 360, 160, 12);
    bannerBg.lineStyle(2, 0x00ff00, 0.6);
    bannerBg.strokeRoundedRect(width / 2 - 180, height / 2 - 80, 360, 160, 12);
    bannerBg.setDepth(10);

    const titleText = this.add.text(width / 2, height / 2 - 50, '✨ NEW ELEMENT DISCOVERED! ✨', {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);

    const targetRadius = 30;
    const scale = targetRadius / (config ? config.radius : 30);
    const icon = this.createItemSprite(width / 2 - 70, height / 2 + 10, tier, false, scale).setDepth(10);

    const descText = this.add.text(width / 2 + 30, height / 2 + 10, `${config ? config.name : 'Unknown'}\nLevel ${tier}\nMerge Value: +${config ? config.score : 0}`, {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      lineSpacing: 4
    }).setOrigin(0.5).setDepth(10);

    // Particle burst at banner
    this.add.particles(width / 2, height / 2, `tier${tier}`, {
      speed: { min: 50, max: 150 },
      scale: { start: 0.4, end: 0 },
      lifespan: 800,
      quantity: 15,
      stopAfter: 15,
      blendMode: 'ADD'
    }).setDepth(9);

    // Fade out after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: [bannerBg, titleText, icon, descText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          bannerBg.destroy();
          titleText.destroy();
          icon.destroy();
          descText.destroy();
        }
      });
    });


  }

  private getCustomVertices(tier: number, exactScale: number): { x: number, y: number }[] | null {
    const rawCoords = CUSTOM_VERTICES[tier];
    if (!rawCoords) return null;

    const points: { x: number, y: number }[] = [];
    const coords = rawCoords.split(',').map(Number);

    for (let i = 0; i < coords.length; i += 2) {
      const px = coords[i];
      const py = coords[i + 1];
      if (px !== undefined && py !== undefined) {
        points.push({
          x: (px - 128) * exactScale,
          y: (py - 128) * exactScale
        });
      }
    }
    return points;
  }

  private createItemSprite(x: number, y: number, tier: number, isLocked: boolean = false, customScale: number = 1.0): Phaser.GameObjects.Sprite {
    const config = TIERS[tier - 1] || TIERS[0] || { radius: 20 };
    const r = config.radius;
    const sprite = this.add.sprite(x, y, `tier${tier}`);
    
    // Uniform visual growth
    const targetDisplaySize = r * 2.5; 
    const exactScale = targetDisplaySize / 256;
    
    if (isLocked) {
      sprite.setDisplaySize(targetDisplaySize * customScale, targetDisplaySize * customScale);
      sprite.setTint(0x000000);
      sprite.setAlpha(0.8);
      sprite.setData('isLockedVisually', true);
    } else {
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setDisplaySize(targetDisplaySize * customScale, targetDisplaySize * customScale);
      sprite.setData('isLockedVisually', false);
    }
    
    // Explicitly set the base scale for tweens
    sprite.setData('baseScale', exactScale * customScale);
    return sprite;
  }

  private spawnMergedItem(x: number, y: number, tier: number) {
    const config = TIERS[tier - 1];
    if (!config) return;
    
    // Spawn normal visual sprite
    const item = this.createItemSprite(x, y, tier);
    
    const r = config.radius; // Remove the arbitrary +3 to keep physics 100% accurate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    
    const options = {
      slop: 0.05,
      restitution: 0.02, // Less bouncy to prevent clipping
      friction: 0.08,
      density: 0.0015 * tier // make higher tiers heavier
    };
    
    // Calculate perfect physics collision matching visual core
    this.matter.world.engine.positionIterations = 12;
    this.matter.world.engine.velocityIterations = 10;
    
    const targetDisplaySize = r * 2.5;
    const exactScale = targetDisplaySize / 256;
    const actualPhysicsRadius = (IMAGE_RADII[tier] || 128) * exactScale;
    
    const vertices = this.getCustomVertices(tier, exactScale);
    if (vertices) {
      try {
        body = this.matter.bodies.fromVertices(x, y, [vertices], options);
      } catch (e) {
        body = this.matter.bodies.circle(x, y, actualPhysicsRadius, options);
      }
    } else {
      body = this.matter.bodies.circle(x, y, actualPhysicsRadius, options);
    }

    this.matter.world.add(body);
    body.gameObject = item;

    item.setData('tier', tier);
    item.setData('targetScale', 1.0);
    item.setData('body', body);
    item.setData('radius', actualPhysicsRadius);
    this.activeItems.push(item);

    // Play corresponding sound effect
    SoundSynth.playMerge(tier);
    
    // Gentle scale punch animation on spawn
    const baseScale = item.getData('baseScale') || 1.0;
    item.setScale(0.1);
    this.tweens.add({
      targets: item,
      scale: baseScale,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  private spawnMergeParticles(x: number, y: number, tier: number) {
    const config = TIERS[tier - 1];
    const r = config ? config.radius : 20;
    
    // Calculate a safe scale for particles based on the loaded texture size
    let texWidth = 256;
    if (this.textures.exists(`tier${tier}`)) {
      const tex = this.textures.get(`tier${tier}`);
      const source = tex.getSourceImage();
      if (source && source.width) {
        texWidth = source.width;
      }
    }
    const particleScale = (r * 1.5) / texWidth;

    const emitter = this.add.particles(x, y, `tier${tier}`, {
      speed: { min: 80, max: 200 },
      scale: { start: particleScale, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      quantity: 12,
      stopAfter: 12,
      blendMode: 'ADD'
    });
    emitter.setDepth(1);
  }

  private spawnScorePopup(x: number, y: number, text: string) {
    const popup = this.add.text(x, y, text, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '24px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => popup.destroy()
    });
  }

  private triggerLegendaryTrophy(x: number, y: number) {
    // Screen shake
    this.cameras.main.shake(400, 0.01);

    // Giant fireworks
    for (let i = 1; i <= 10; i++) {
      this.time.delayedCall(i * 100, () => {
        this.add.particles(x + Phaser.Math.Between(-50, 50), y + Phaser.Math.Between(-50, 50), `tier${Phaser.Math.Between(1, 12)}`, {
          speed: { min: 100, max: 300 },
          scale: { start: 0.3, end: 0 },
          lifespan: 1000,
          quantity: 20,
          stopAfter: 20,
          blendMode: 'ADD'
        });
      });
    }

    // Award flair via server fetch
    fetch('/api/award-flair', { method: 'POST' })
      .then(res => res.json())
      .then((data: AwardFlairResponse) => {
        if (data.status === 'success') {
          this.spawnScorePopup(x, y - 80, '👑 User Flair Awarded!');
        }
      })
      .catch(err => console.error("Failed to award flair:", err));
  }

  private drawGuideLine() {
    if (!this.guideLine) {
      this.guideLine = this.add.graphics();
    }
    this.guideLine.clear();
    if (this.currentPreviewItem) {
      this.guideLine.lineStyle(1.5, 0xffffff, 0.15);
      const startY = this.dropperY;
      const centerX = this.scale.width / 2;
      const dx = this.currentPreviewItem.x - centerX;
      const curveY = this.containerBottom - this.containerHeight * Math.pow(dx / (this.containerWidth / 2), 4);
      const endY = curveY - 5;
      for (let y = startY; y < endY; y += 10) {
        this.guideLine.lineBetween(this.currentPreviewItem.x, y, this.currentPreviewItem.x, y + 5);
      }
    }
  }

  private movePreview(x: number) {
    if (this.isGameOver || !this.currentPreviewItem) return;
    const tier = this.currentPreviewItem.getData('tier') as number;
    const tierConfig = TIERS[tier - 1];
    // Match the real physics radius used when the item is dropped
    const r = tierConfig ? tierConfig.radius : 15;
    const targetDisplaySize = r * 2.5;
    const exactScale = targetDisplaySize / 256;
    const radius = (IMAGE_RADII[tier] || 128) * exactScale;
    
    // Constrain dropper movement within walls
    const centerX = this.scale.width / 2;
    const minX = centerX - this.containerWidth / 2 + radius;
    const maxX = centerX + this.containerWidth / 2 - radius;
    this.currentPreviewItem.x = Phaser.Math.Clamp(x, minX, maxX);
  }

  private dropItem(x: number) {
    if (this.dropCooldown || !this.currentPreviewItem) return;

    this.mouseHasMoved = false;
    this.lastMoveX = x;

    this.dropCooldown = true;
    const item = this.currentPreviewItem;
    const tier = item.getData('tier') as number;
    const tierConfig = TIERS[tier - 1];
    const radius = tierConfig ? tierConfig.radius : 15;

    // Remove preview object
    this.currentPreviewItem = null;
    if (this.guideLine) this.guideLine.clear();

    // Spawn normal visual sprite
    const dropped = this.createItemSprite(x, this.dropperY, tier);
    
    const r = radius;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    
    const options = {
      slop: 0.05,
      restitution: 0.02, // squishy, absorbs impact
      friction: 0.08,
      density: 0.0015 * tier
    };

    const targetDisplaySize = r * 2.5;
    const exactScale = targetDisplaySize / 256;
    const actualPhysicsRadius = (IMAGE_RADII[tier] || 128) * exactScale;

    const vertices = this.getCustomVertices(tier, exactScale);
    if (vertices) {
      try {
        body = this.matter.bodies.fromVertices(x, this.dropperY, [vertices], options);
      } catch (e) {
        body = this.matter.bodies.circle(x, this.dropperY, actualPhysicsRadius, options);
      }
    } else {
      body = this.matter.bodies.circle(x, this.dropperY, actualPhysicsRadius, options);
    }

    this.matter.world.add(body);
    body.gameObject = dropped;

    dropped.setData('tier', tier);
    dropped.setData('targetScale', 1.0);
    dropped.setData('body', body);
    dropped.setData('radius', actualPhysicsRadius);
    this.activeItems.push(dropped);

    // Play drop sound effect
    SoundSynth.playDrop();

    // Destroy local preview sprite
    item.destroy();

    // Setup next preview item after small delay
    this.time.delayedCall(600, () => {
      this.dropCooldown = false;
      this.setupNextItem();
    });
  }

  private setupNextItem() {
    if (this.isGameOver || this.dropSequence.length === 0) return;

    this.mouseHasMoved = false;
    this.lastMoveX = this.input.activePointer.x;

    const currentTier = this.dropSequence[this.sequenceIndex] || 1;
    this.sequenceIndex = (this.sequenceIndex + 1) % this.dropSequence.length;

    const centerX = this.scale.width / 2;

    // Create current preview sprite
    this.currentPreviewItem = this.createItemSprite(centerX, this.dropperY, currentTier);
    this.currentPreviewItem.setAlpha(0.85); // slightly transparent preview
    this.currentPreviewItem.setData('tier', currentTier);

    // Setup next drop indicator icon
    const nextTier = this.dropSequence[this.sequenceIndex] || 1;
    if (this.nextItemIcon) {
      this.nextItemIcon.destroy();
    }
    
    const isDesktop = this.scale.width >= 720;
    if (isDesktop) {
      const rightX = centerX + this.containerWidth / 2 + 20;
      const sidebarWidth = 190;
      this.nextItemIcon = this.createItemSprite(rightX + sidebarWidth / 2, this.containerTop + 75, nextTier, false, 0.65);
    } else {
      this.nextItemIcon = this.createItemSprite(this.scale.width - 50, 45, nextTier, false, 0.6);
    }
  }

  private checkOverflow(delta: number) {
    let anyAboveLine = false;

    // Check all body positions
    const bodies = this.matter.world.getAllBodies();
    for (const body of bodies) {
      if (body.isStatic) continue;

      // Skip items still in motion (e.g. a piece dropping down through the line).
      // Only count bodies that are essentially at rest above the line, otherwise
      // the warning line flashes on every drop and the overflow check becomes unreliable.
      const speed = body.speed || 0;
      if (speed >= 0.7) continue;

      // Use the item's actual physics radius (works for polygon bodies too,
      // which have no `circleRadius`).
      const go = body.gameObject as Phaser.GameObjects.Sprite | undefined;
      const radius = (go && go.getData('radius')) || body.circleRadius || 0;

      // Check if body resides above warning line
      if (body.position.y - radius < this.gameOverLineY) {
        anyAboveLine = true;
        break;
      }
    }

    const centerX = this.scale.width / 2;

    if (anyAboveLine) {
      this.dangerTimer += delta;
      
      // Flash warning line
      if (this.warningLine) {
        this.warningLine.clear();
        const flashColor = Math.floor(Date.now() / 200) % 2 === 0 ? 0xff0000 : 0xff3333;
        this.warningLine.lineStyle(3, flashColor, 0.85);
        const halfW = this.containerWidth / 2;
        const warningWidth = halfW * Math.pow((this.containerHeight - 40) / this.containerHeight, 0.25);
        this.warningLine.lineBetween(centerX - warningWidth, this.gameOverLineY, centerX + warningWidth, this.gameOverLineY);
      }

      if (this.dangerTimer > 3000) { // 3 seconds above line
        this.triggerGameOver();
      }
    } else {
      this.dangerTimer = 0;
      if (this.warningLine) {
        this.warningLine.clear();
        this.warningLine.lineStyle(2, 0xff3333, 0.35);
        const halfW = this.containerWidth / 2;
        const warningWidth = halfW * Math.pow((this.containerHeight - 40) / this.containerHeight, 0.25);
        this.warningLine.lineBetween(centerX - warningWidth, this.gameOverLineY, centerX + warningWidth, this.gameOverLineY);
      }
    }
  }

  private triggerGameOver() {
    this.isGameOver = true;
    
    // Play game over sound
    SoundSynth.playGameOver();

    // Stop dropper
    if (this.currentPreviewItem) this.currentPreviewItem.destroy();
    if (this.guideLine) this.guideLine.clear();

    // Submit score to Devvit server
    fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: this.score, unlockedTiers: this.unlockedTiers })
    })
      .then(res => res.json())
      .then((data: ScoreResponse) => {
        this.scene.start('GameOver', {
          score: this.score,
          personalBest: data.personalBest,
          newHighScore: data.newHighScore,
          rank: data.rank,
          percentile: data.percentile
        });
      })
      .catch(err => {
        console.error("Failed to submit score:", err);
        this.scene.start('GameOver', {
          score: this.score,
          personalBest: this.highScore,
          newHighScore: this.score > this.highScore
        });
      });
  }

  private fetchInitData() {
    fetch('/api/init')
      .then(res => res.json())
      .then((data: InitResponse) => {
        this.username = data.username;
        this.subredditName = data.subredditName;
        this.dailySeed = data.dailySeed;
        this.dropSequence = data.sequence;
        this.highScore = data.highScore;
        this.activeRaids = data.activeRaids || [];
        this.top10Streak = data.top10Streak || 0;
        this.unlockedBadges = data.unlockedBadges || [];

        // Merge server-side progress with local storage so progress survives
        // redeploys/cache clears (server is source of truth, local is fallback).
        if (data.unlockedTiers && data.unlockedTiers.length > 0) {
          this.unlockedTiers = this.mergeUnlockedTiers(this.unlockedTiers, data.unlockedTiers);
          try {
            localStorage.setItem('snoodrop_unlocked_elements', JSON.stringify(this.unlockedTiers));
          } catch (e) {
            // Ignore localStorage errors
          }
          this.updateProgressTracker();
        }

        // Update UI displays
        if (this.isDesktop) {
          this.highScoreText?.setText(`🏆 PB: ${this.highScore.toLocaleString()}`);
          this.dailySeedText?.setText(`SEED: ${this.dailySeed}`);
        } else {
          this.highScoreText?.setText(`High Score: ${this.highScore}`);
          this.dailySeedText?.setText(`Daily Seed: ${this.dailySeed}`);
        }
        this.usernameText?.setText(`u/${this.username}`);
        this.subredditTitleText?.setText(`r/${this.subredditName}`);

        // Update daily streak display
        if (this.isDesktop) {
          this.streakText?.setText(this.top10Streak > 0 ? `🔥 STREAK: ${this.top10Streak} DAYS` : `🔥 STREAK: 0 DAYS`);
          this.streakText?.setColor(this.top10Streak > 0 ? '#ff6a00' : '#717d93');
          this.streakText?.setFontStyle('bold');
        } else {
          this.streakText?.setText(this.top10Streak > 0 ? `🔥 Streak: ${this.top10Streak} Days` : `🔥 Streak: 0 Days`);
          if (this.top10Streak > 0) {
            this.streakText?.setColor('#ff4500');
            this.streakText?.setFontStyle('bold');
          }
        }

        // Adjust for mobile header layout
        const width = this.scale.width;
        if (width < 720) {
          this.usernameText?.setText(`u/${this.username} ${this.top10Streak > 0 ? '🔥 ' + this.top10Streak : ''}`);
          
          const oldMb = this.children.getByName('mobileBadgesText');
          if (oldMb) oldMb.destroy();
          const badgeEmojis = this.unlockedBadges.map(b => b.split(' ')[0]).join(' ');
          if (badgeEmojis) {
            const badgeText = this.add.text(width / 2, 90, badgeEmojis, {
              fontFamily: 'Outfit',
              fontSize: '13px'
            }).setOrigin(0.5);
            badgeText.setName('mobileBadgesText');
          }
        } else {
          // Re-draw/update badges panel in desktop left sidebar
          const sidebarWidth = 190;
          const centerX = width / 2;
          const leftX = centerX - this.containerWidth / 2 - 20 - sidebarWidth;
          this.drawBadgesPanel(leftX + 20, this.containerTop + 415, sidebarWidth - 40);
        }

        this.setupNextItem();

        // Spawn raid downvote obstacles if active
        if (this.activeRaids.length > 0) {
          SoundSynth.playRaid();
          this.spawnRaidDownvotes();
        }

        // Draw subreddits leaderboard
        this.drawLeaderboards(data.leaderboard);
      })
      .catch(err => {
        console.error("Failed to fetch initial data. Falling back to local offline seed.", err);
        this.dailySeed = 20260701;
        this.dropSequence = Array.from({ length: 500 }, () => Math.floor(Math.random() * 4) + 1);
        this.setupNextItem();
      });
  }

  private spawnRaidDownvotes() {
    const centerX = this.scale.width / 2;
    const containerBottom = this.containerBottom;
    const containerTop = this.containerTop;

    const obsY = containerBottom - 50;
    const offset = Math.min(70, this.containerWidth * 0.18);
    const leftObsX = centerX - offset;
    const rightObsX = centerX + offset;
    const obsWidth = 80;
    const obsHeight = 24;

    this.matter.add.rectangle(leftObsX, obsY, obsWidth, obsHeight, { isStatic: true, friction: 0.1 });
    this.matter.add.rectangle(rightObsX, obsY, obsWidth, obsHeight, { isStatic: true, friction: 0.1 });
    
    // Draw visual textures for these downvotes
    const graphics1 = this.add.graphics();
    graphics1.fillStyle(0x0000ff, 0.4);
    graphics1.fillRoundedRect(leftObsX - obsWidth / 2, obsY - obsHeight / 2, obsWidth, obsHeight, 6);
    graphics1.lineStyle(2, 0xffffff, 0.3);
    graphics1.strokeRoundedRect(leftObsX - obsWidth / 2, obsY - obsHeight / 2, obsWidth, obsHeight, 6);
    
    this.add.text(leftObsX, obsY, '▼ DOWNVOTE', {
      fontFamily: 'Outfit',
      fontSize: '11px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const graphics2 = this.add.graphics();
    graphics2.fillStyle(0x0000ff, 0.4);
    graphics2.fillRoundedRect(rightObsX - obsWidth / 2, obsY - obsHeight / 2, obsWidth, obsHeight, 6);
    graphics2.lineStyle(2, 0xffffff, 0.3);
    graphics2.strokeRoundedRect(rightObsX - obsWidth / 2, obsY - obsHeight / 2, obsWidth, obsHeight, 6);

    this.add.text(rightObsX, obsY, '▼ DOWNVOTE', {
      fontFamily: 'Outfit',
      fontSize: '11px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Floating alert banner
    const alertBanner = this.add.text(centerX, containerTop + 40, '⚠️ SUBREDDIT RAID ACTIVE! DOWNVOTE OBSTACLES PLACED!', {
      fontFamily: 'Outfit',
      fontSize: '12px',
      color: '#ff3333',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: alertBanner,
      alpha: { start: 1, end: 0.1 },
      yoyo: true,
      repeat: 3,
      duration: 600,
      onComplete: () => alertBanner.destroy()
    });
  }

  private drawLeaderboards(leaderboard: LeaderboardEntry[]) {
    const { width } = this.scale;
    const isDesktop = width >= 720;

    if (isDesktop && this.leaderboardContainer) {
      // Clear out previous entries in leaderboardContainer (except title)
      const listItems = this.leaderboardContainer.list;
      for (let i = listItems.length - 1; i > 0; i--) {
        const item = listItems[i];
        if (item) {
          item.destroy();
        }
      }

      // Calculate how many single-line entries can fit dynamically based on container height
      const availableHeight = this.containerHeight - 365;
      const maxEntries = Math.max(2, Math.floor(availableHeight / 20));

      leaderboard.slice(0, maxEntries).forEach((entry, idx) => {
        const entryText = this.add.text(0, 25 + idx * 20, `${idx + 1}. u/${entry.username.substring(0, 8)} (${entry.score})`, {
          fontFamily: 'Outfit',
          fontSize: '11px',
          color: idx === 0 ? '#ffd700' : '#ffffff'
        });
        this.leaderboardContainer?.add(entryText);
      });
    } else {
      // Mobile ranking banner above the tracker
      const rankingsY = this.scale.height - 65;
      
      const existingText = this.children.getByName('mobileRankingsText');
      if (existingText) existingText.destroy();

      let textStr = '';
      leaderboard.slice(0, 3).forEach((entry, idx) => {
        textStr += `${idx + 1}. u/${entry.username} (${entry.score})   `;
      });
      
      const rankingsText = this.add.text(width / 2, rankingsY, textStr || 'No runs yet today. Be the first!', {
        fontFamily: 'Outfit',
        fontSize: '11px',
        color: '#ffd700',
        align: 'center'
      }).setOrigin(0.5);
      rankingsText.setName('mobileRankingsText');
    }
  }

  private applyJellyBounce(sprite: Phaser.GameObjects.Sprite, impactSpeed: number) {
    if (!sprite || !sprite.active || sprite.getData('isJellyTweening')) return;
    sprite.setData('isJellyTweening', true);

    const baseScale = sprite.getData('baseScale') || 1.0;
    const targetScale = (sprite.getData('targetScale') || 1.0) * baseScale;

    // Smooth single squeeze based on impact velocity (capped at 8% deformation)
    const squashFactor = Math.min(0.08, impactSpeed * 0.015);
    const targetScaleX = targetScale * (1 + squashFactor);
    const targetScaleY = targetScale * (1 - squashFactor);

    this.tweens.add({
      targets: sprite,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 100,
      yoyo: true,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (sprite.active) {
          sprite.setScale(targetScale);
          sprite.setData('isJellyTweening', false);
        }
      }
    });
  }

  private drawBadgesPanel(x: number, y: number, _width: number) {
    if (this.badgesContainer) {
      this.badgesContainer.destroy();
    }
    this.badgesContainer = this.add.container(x, y);

    const title = this.add.text(0, 0, '🏅 LEGENDARY BADGES', {
      fontFamily: 'Outfit',
      fontSize: '12px',
      color: '#00ffff',
      fontStyle: 'bold'
    });
    this.badgesContainer.add(title);

    const badgeNames = ['🥉 Veteran Merger', '🥈 Master Merger', '🥇 Legendary Merger', '🌌 Transcendent Master'];

    badgeNames.forEach((name, idx) => {
      const hasUnlocked = this.unlockedBadges.includes(name);
      const badgeY = 25 + idx * 22;

      const emoji = name.split(' ')[0] || '🏅';
      const label = name.split(' ').slice(1).join(' ');

      const badgeText = this.add.text(0, badgeY, `${emoji} ${label}`, {
        fontFamily: 'Outfit',
        fontSize: '11px',
        color: hasUnlocked ? '#ffffff' : '#444b66',
        fontStyle: hasUnlocked ? 'bold' : 'normal'
      });

      this.badgesContainer?.add(badgeText);
    });
  }
}
