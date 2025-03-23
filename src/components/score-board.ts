import Phaser from 'phaser';
import { gameState, PlayerState } from '../game-state';

export class Scoreboard {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private playerRows: Map<string, Phaser.GameObjects.Container> = new Map();
  private headerText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;

    // Create background and container
    this.background = scene.add.rectangle(x, y, width, height, 0x222222, 0.8)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xaaaaaa);

    this.container = scene.add.container(x, y);

    // Add header
    this.headerText = scene.add.text(10, 10, 'PLAYER RANKINGS', {
      font: 'bold 18px Arial',
      color: '#ffffff'
    });
    this.container.add(this.headerText);

    // Initial update
    this.update();
  }

  update(): void {
    // Clear existing player rows
    this.playerRows.forEach(row => row.destroy());
    this.playerRows.clear();

    // Get sorted players by points
    const players = Array.from(gameState.players.values())
        .sort((a, b) => b.points - a.points);

    // Create player rows
    players.forEach((player, index) => {
      const yPos = 40 + (index * 30);
      const row = this.createPlayerRow(player, 10, yPos);
      this.container.add(row);
      this.playerRows.set(player.id, row);
    });

    // Resize background if needed
    const newHeight = Math.max(150, 50 + (players.length * 30));
    this.background.height = newHeight;
  }

  private createPlayerRow(player: PlayerState, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    // Create colored indicator based on player identity
    let color = 0x00ff00; // Default human player color
    if (player.id.startsWith('bot')) {
      color = 0xff0000; // Bot color
    }

    const indicator = this.scene.add.rectangle(0, 0, 16, 16, color)
        .setOrigin(0, 0);

    // Create name and score text
    const nameText = this.scene.add.text(25, 0, player.name, {
      font: '16px Arial',
      color: '#ffffff'
    });

    const scoreText = this.scene.add.text(150, 0, `${player.points} pts`, {
      font: '16px Arial',
      color: '#ffff00'
    });

    // Create territories text
    const territoryText = this.scene.add.text(220, 0,
        `${player.conquered.length} territories`, {
          font: '16px Arial',
          color: '#aaaaaa'
        });

    container.add([indicator, nameText, scoreText, territoryText]);
    return container;
  }
}
