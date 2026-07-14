import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { RaidResponse } from '../../shared/api';

export class GameOver extends Scene {
  private score: number = 0;
  private personalBest: number = 0;
  private newHighScore: boolean = false;
  private rank: number | undefined;
  private percentile: number | undefined;

  constructor() {
    super('GameOver');
  }

  init(data: { score: number; personalBest: number; newHighScore: boolean; rank?: number; percentile?: number }) {
    this.score = data.score || 0;
    this.personalBest = data.personalBest || 0;
    this.newHighScore = data.newHighScore || false;
    this.rank = data.rank;
    this.percentile = data.percentile;
  }

  create() {
    this.refreshLayout();

    this.scale.on('resize', this.refreshLayout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.refreshLayout, this);
    });
  }

  private refreshLayout() {
    this.children.removeAll();
    this.tweens.killAll();

    const { width, height } = this.scale;
    this.cameras.resize(width, height);

    // Background styling
    this.cameras.main.setBackgroundColor(0x0c0d16);

    // Dotted pattern grid
    this.add.grid(width / 2, height / 2, width, height, 40, 40, 0xffffff, 0.015, 0xffffff, 0.03);

    // Title
    this.add.text(width / 2, height * 0.18, 'GAME OVER', {
      fontFamily: 'Arial Black',
      fontSize: '44px',
      color: '#ff3333',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);

    // Score display board
    const board = this.add.graphics();
    board.fillStyle(0x131722, 0.9);
    board.fillRoundedRect(40, height * 0.28, width - 80, 180, 12);
    board.lineStyle(2, 0xffffff, 0.08);
    board.strokeRoundedRect(40, height * 0.28, width - 80, 180, 12);

    this.add.text(width / 2, height * 0.33, 'Final Upvotes (Score)', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      color: '#a0aabf'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, `${this.score}`, {
      fontFamily: 'Arial Black',
      fontSize: '48px',
      color: '#ff4500' // Reddit Orange-Red
    }).setOrigin(0.5);

    const pbText = this.add.text(width / 2, height * 0.45, `Personal Best: ${this.personalBest}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '15px',
      color: '#ffd700'
    }).setOrigin(0.5);

    if (this.newHighScore) {
      pbText.setColor('#00ff00');
      const newHighScoreText = this.add.text(width / 2, height * 0.24, '🎉 NEW HIGH SCORE! 🎉', {
        fontFamily: 'Arial Black',
        fontSize: '20px',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      
      this.tweens.add({
        targets: newHighScoreText,
        scale: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 500
      });
    }

    let rankTextStr = '';
    if (this.rank !== undefined) {
      rankTextStr = `Global Rank: #${this.rank}`;
    } else if (this.percentile !== undefined) {
      rankTextStr = `Top ${this.percentile}% of players`;
    }

    if (rankTextStr) {
      this.add.text(width / 2, height * 0.50, rankTextStr, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        color: '#00ffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    // Play Again button
    const playAgainBtn = this.add.text(width / 2, height * 0.58, 'Play Again', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#ff4500',
      padding: { x: 40, y: 14 }
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => playAgainBtn.setStyle({ backgroundColor: '#ff5722' }))
      .on('pointerout', () => playAgainBtn.setStyle({ backgroundColor: '#ff4500' }))
      .on('pointerdown', () => this.scene.start('Game'));

    // Subreddit War & Raid Panel
    this.createRaidPanel(width, height);
  }

  private createRaidPanel(width: number, height: number) {
    const raidY = height * 0.68;

    // Border container for raids
    const panel = this.add.graphics();
    panel.fillStyle(0x0e111a, 0.7);
    panel.fillRoundedRect(40, raidY, width - 80, 190, 8);
    panel.lineStyle(1.5, 0x00ffff, 0.2);
    panel.strokeRoundedRect(40, raidY, width - 80, 190, 8);

    this.add.text(width / 2, raidY + 20, '⚔️ SUBREDDIT WAR: RAID RIVALS ⚔️', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      color: '#00ffff',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, raidY + 45, 'Spend score to place Downvote Traps in rival containers!', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      color: '#a0aabf',
      align: 'center'
    }).setOrigin(0.5);

    // Raid button 1: r/gaming
    const raidCost = 100;
    const canRaid = this.score >= raidCost;

    const createRaidButton = (x: number, y: number, target: string) => {
      const btn = this.add.text(x, y, `Raid r/${target}\n(Cost: 100)`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '13px',
        color: canRaid ? '#ffffff' : '#555555',
        backgroundColor: canRaid ? '#1a2238' : '#222222',
        padding: { x: 16, y: 10 },
        align: 'center'
      }).setOrigin(0.5);

      if (canRaid) {
        btn.setInteractive({ useHandCursor: true })
           .on('pointerover', () => btn.setStyle({ backgroundColor: '#263354' }))
           .on('pointerout', () => btn.setStyle({ backgroundColor: '#1a2238' }))
           .on('pointerdown', () => this.sendRaid(target, btn));
      }
    };

    createRaidButton(width * 0.32, raidY + 110, 'gaming');
    createRaidButton(width * 0.68, raidY + 110, 'funny');
  }

  private sendRaid(target: string, btn: Phaser.GameObjects.Text) {
    btn.disableInteractive();
    btn.setText('RAIDING...');

    fetch('/api/raid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetSubreddit: target, cost: 100 })
    })
      .then(res => res.json())
      .then((data: RaidResponse) => {
        if (data.status === 'success') {
          btn.setText('RAID DEPLOYED!');
          btn.setStyle({ color: '#00ff00', backgroundColor: '#0e2b1b' });
          // Deduct score from interface
          this.score -= 100;
        } else {
          btn.setText('FAILED');
          btn.setStyle({ color: '#ff3333' });
        }
      })
      .catch(err => {
        console.error("Raid request failed:", err);
        btn.setText('ERROR');
        btn.setStyle({ color: '#ff3333' });
      });
  }
}
