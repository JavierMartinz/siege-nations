import Phaser from 'phaser';
import { Territory, PlayerState, gameState, AttackResult } from '../game-state';

export class TerritoryDetails {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private ownerText: Phaser.GameObjects.Text;
  private resourcesText: Phaser.GameObjects.Text;
  private strengthText: Phaser.GameObjects.Text;
  private adjacentText: Phaser.GameObjects.Text;
  private attackButton?: Phaser.GameObjects.Container;
  private resultText?: Phaser.GameObjects.Text;

  private currentTerritory?: Territory;
  private playerID: string;
  private onAttack: (result: AttackResult) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, playerID: string, onAttack: (result: AttackResult) => void) {
    this.scene = scene;
    this.playerID = playerID;
    this.onAttack = onAttack;

    // Create background and container
    this.background = scene.add.rectangle(x, y, width, height, 0x222222, 0.8)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xaaaaaa)
        .setVisible(false);

    this.container = scene.add.container(x, y)
        .setVisible(false);

    // Add text elements
    this.titleText = scene.add.text(10, 10, 'TERRITORY INFO', {
      font: 'bold 18px Arial',
      color: '#ffffff'
    });

    this.ownerText = scene.add.text(10, 40, '', {
      font: '16px Arial',
      color: '#ffffff'
    });

    this.resourcesText = scene.add.text(10, 70, '', {
      font: '16px Arial',
      color: '#ffffff'
    });

    this.strengthText = scene.add.text(10, 130, '', {
      font: '16px Arial',
      color: '#ffffff'
    });

    this.adjacentText = scene.add.text(10, 160, '', {
      font: '16px Arial',
      color: '#ffffff',
      wordWrap: { width: width - 20 }
    });

    this.container.add([
      this.titleText,
      this.ownerText,
      this.resourcesText,
      this.strengthText,
      this.adjacentText
    ]);
  }

  show(territory: Territory): void {
    this.currentTerritory = territory;

    // Update title
    this.titleText.setText(`TERRITORY ${territory.id}`);

    // Update owner info
    let ownerName = 'Neutral';
    let ownerColor = '#8888ff';

    if (territory.owner) {
      const owner = gameState.players.get(territory.owner);
      if (owner) {
        ownerName = owner.name;
        ownerColor = territory.owner === this.playerID ? '#00ff00' : '#ff0000';
      }
    }

    this.ownerText.setText(`Owner: ${ownerName}`);
    this.ownerText.setColor(ownerColor);

    // Update resources
    this.resourcesText.setText(
        `Resources per turn:\n` +
        `Gold: ${territory.resources.gold}\n` +
        `Steel: ${territory.resources.steel}\n` +
        `Energy: ${territory.resources.energy}`
    );

    // Update strength
    this.strengthText.setText(`Defense Strength: ${territory.strength}`);

    // Update adjacent territories
    const adjacentNames = territory.adjacentTo.map(id => {
      const adjacentTerritory = gameState.territories.find(t => t.id === id);
      if (!adjacentTerritory) return id;

      let ownerInfo = ' (Neutral)';
      if (adjacentTerritory.owner) {
        const adjacentOwner = gameState.players.get(adjacentTerritory.owner);
        if (adjacentOwner) {
          ownerInfo = ` (${adjacentOwner.name})`;
        }
      }

      return `${id}${ownerInfo}`;
    });

    this.adjacentText.setText(`Adjacent to: ${adjacentNames.join(', ')}`);

    // Create or update attack button if the territory is not owned by the player
    if (territory.owner !== this.playerID) {
      this.createAttackButton();
    } else if (this.attackButton) {
      this.attackButton.destroy();
      this.attackButton = undefined;
    }

    // Remove any previous result text
    if (this.resultText) {
      this.resultText.destroy();
      this.resultText = undefined;
    }

    // Make everything visible
    this.background.setVisible(true);
    this.container.setVisible(true);
  }

  hide(): void {
    this.background.setVisible(false);
    this.container.setVisible(false);

    if (this.attackButton) {
      this.attackButton.destroy();
      this.attackButton = undefined;
    }

    if (this.resultText) {
      this.resultText.destroy();
      this.resultText = undefined;
    }

    this.currentTerritory = undefined;
  }

  private createAttackButton(): void {
    if (this.attackButton) {
      this.attackButton.destroy();
    }

    // Create container for button
    this.attackButton = this.scene.add.container(100, 220);

    // Create button background
    const buttonBg = this.scene.add.rectangle(0, 0, 120, 40, 0xff0000)
        .setOrigin(0.5, 0.5)
        .setInteractive()
        .on('pointerover', () => buttonBg.setFillStyle(0xff3333))
        .on('pointerout', () => buttonBg.setFillStyle(0xff0000))
        .on('pointerdown', () => this.handleAttack());

    // Create button text
    const buttonText = this.scene.add.text(0, 0, 'ATTACK', {
      font: 'bold 16px Arial',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    this.attackButton.add([buttonBg, buttonText]);
    this.container.add(this.attackButton);
  }

  private handleAttack(): void {
    if (!this.currentTerritory) return;

    // Perform the attack
    const result = gameState.conquerTerritory(this.playerID, this.currentTerritory.id);

    // Show result
    if (this.resultText) {
      this.resultText.destroy();
    }

    this.resultText = this.scene.add.text(10, 260, result.message, {
      font: '14px Arial',
      color: result.success ? '#00ff00' : '#ff6666',
      wordWrap: { width: 280 }
    });

    this.container.add(this.resultText);

    // Update the view
    this.show(this.currentTerritory);

    // Trigger callback
    this.onAttack(result);
  }

  update(): void {
    if (this.currentTerritory) {
      this.show(this.currentTerritory);
    }
  }
}
