import Phaser from 'phaser';
import { gameState } from '../gameState';

export default class MapScene extends Phaser.Scene {
  private playerId = 'player1';
  private playerName = 'Jugador 1';
  private pointsText!: Phaser.GameObjects.Text;

  constructor() {
    super('MapScene');
  }

  create() {
    this.add.text(20, 20, 'Siege Nations - Mapa de Conquista', { font: '24px Arial', color: '#ffffff' });

    gameState.addPlayer(this.playerId, this.playerName);

    this.pointsText = this.add.text(20, 60, '', { font: '20px Arial', color: '#ffff00' });
    this.updatePointsDisplay();

    gameState.territories.forEach((t) => {
      const circle = this.add.circle(t.x, t.y, 40, 0x8888ff).setInteractive();
      const label = this.add.text(t.x - 10, t.y - 10, t.id, { color: '#000' });

      circle.on('pointerdown', () => {
        gameState.conquerTerritory(this.playerId, t.id);
        this.updateTerritoryColors();
        this.updatePointsDisplay();
        console.log(`Territorio ${t.id} conquistado por ${this.playerName}`);
      });

      // Store reference for later updates if needed
      (t as any).circle = circle;
    });

    this.updateTerritoryColors();
  }

  updateTerritoryColors() {
    gameState.territories.forEach((t) => {
      const circle = (t as any).circle as Phaser.GameObjects.Arc;
      if (t.owner === this.playerId) {
        circle.setFillStyle(0x00ff00); // verde si es tuyo
      } else if (t.owner) {
        circle.setFillStyle(0xff0000); // rojo si es de otro
      } else {
        circle.setFillStyle(0x8888ff); // neutral
      }
    });
  }

  updatePointsDisplay() {
    const state = gameState.getPlayerState(this.playerId);
    this.pointsText.setText(`Puntos: ${state?.points ?? 0}`);
  }
}