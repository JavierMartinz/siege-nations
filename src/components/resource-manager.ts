import Phaser from 'phaser';
import { gameState, PlayerState } from '../game-state';

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  cost: {
    gold: number;
    steel: number;
    energy: number;
  };
  effect: (playerId: string) => void;
  requirementCheck: (player: PlayerState) => boolean;
}

export class ResourceManager {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private upgradeButtons: Phaser.GameObjects.Container[] = [];
  private statusText: Phaser.GameObjects.Text;

  private playerId: string;
  private visible: boolean = false;
  private upgradeOptions: UpgradeOption[] = [];
  private onUpgradePurchased: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, playerId: string, onUpgradePurchased: () => void) {
    this.scene = scene;
    this.playerId = playerId;
    this.onUpgradePurchased = onUpgradePurchased;

    // Create background and container
    this.background = scene.add.rectangle(x, y, width, height, 0x222222, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xaaaaaa)
        .setVisible(false);

    this.container = scene.add.container(x, y)
        .setVisible(false);

    // Add title
    this.titleText = scene.add.text(width / 2, 20, 'RESOURCE MANAGEMENT', {
      font: 'bold 20px Arial',
      color: '#ffffff'
    }).setOrigin(0.5, 0);

    // Add status text
    this.statusText = scene.add.text(20, height - 40, '', {
      font: '14px Arial',
      color: '#ffffff'
    });

    this.container.add([this.titleText, this.statusText]);

    // Define upgrade options
    this.setupUpgradeOptions();
  }

  private setupUpgradeOptions() {
    this.upgradeOptions = [
      {
        id: 'military_training',
        name: 'Military Training',
        description: 'Increase attack strength by 10 points',
        cost: { gold: 15, steel: 10, energy: 5 },
        effect: (playerId: string) => {
          const player = gameState.getPlayerState(playerId);
          if (player) {
            player.strength += 10;
          }
        },
        requirementCheck: (player: PlayerState) => true
      },
      {
        id: 'fortify_territories',
        name: 'Fortify Territories',
        description: 'Increase defense of all your territories by 5 points',
        cost: { gold: 10, steel: 20, energy: 5 },
        effect: (playerId: string) => {
          gameState.territories.forEach(territory => {
            if (territory.owner === playerId) {
              territory.strength += 5;
            }
          });
        },
        requirementCheck: (player: PlayerState) => player.conquered.length > 0
      },
      {
        id: 'resource_optimization',
        name: 'Resource Optimization',
        description: 'Territories generate +1 of each resource per turn',
        cost: { gold: 20, steel: 15, energy: 25 },
        effect: (playerId: string) => {
          gameState.territories.forEach(territory => {
            if (territory.owner === playerId) {
              territory.resources.gold += 1;
              territory.resources.steel += 1;
              territory.resources.energy += 1;
            }
          });
        },
        requirementCheck: (player: PlayerState) => player.conquered.length >= 2
      },
      {
        id: 'advanced_logistics',
        name: 'Advanced Logistics',
        description: 'Can attack territories that are 2 steps away',
        cost: { gold: 30, steel: 20, energy: 40 },
        effect: (playerId: string) => {
          const player = gameState.getPlayerState(playerId);
          if (player) {
            (player as any).extendedRange = true;
          }
        },
        requirementCheck: (player: PlayerState) => player.level >= 2 && player.conquered.length >= 3
      },
      {
        id: 'diplomatic_relations',
        name: 'Diplomatic Relations',
        description: 'One enemy faction will not attack you for 3 turns',
        cost: { gold: 50, steel: 20, energy: 30 },
        effect: (playerId: string) => {
          // Choose a random enemy
          const enemies = ['bot1', 'bot2'].filter(id => id !== playerId);
          if (enemies.length > 0) {
            const enemy = Phaser.Math.RND.pick(enemies);
            (gameState as any).diplomaticImmunity = {
              protectedPlayer: playerId,
              nonAggressorPlayer: enemy,
              turnsLeft: 3
            };
          }
        },
        requirementCheck: (player: PlayerState) => player.level >= 3
      }
    ];
  }

  show(): void {
    this.visible = true;
    this.background.setVisible(true);
    this.container.setVisible(true);
    this.createUpgradeButtons();
    this.updateStatus();
  }

  hide(): void {
    this.visible = false;
    this.background.setVisible(false);
    this.container.setVisible(false);

    // Clean up buttons
    this.upgradeButtons.forEach(button => button.destroy());
    this.upgradeButtons = [];
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  update(): void {
    if (!this.visible) return;

    this.updateStatus();
    this.updateButtonStates();
  }

  private createUpgradeButtons(): void {
    // Clean up existing buttons
    this.upgradeButtons.forEach(button => button.destroy());
    this.upgradeButtons = [];

    // Create buttons for each upgrade option
    const startY = 60;
    const spacing = 70;

    this.upgradeOptions.forEach((upgrade, index) => {
      const y = startY + (index * spacing);
      const button = this.createUpgradeButton(upgrade, 20, y);
      this.container.add(button);
      this.upgradeButtons.push(button);
    });
  }

  private createUpgradeButton(upgrade: UpgradeOption, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const width = 360;
    const height = 60;

    // Background
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x333333)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x666666);

    // Title
    const title = this.scene.add.text(10, 5, upgrade.name, {
      font: 'bold 16px Arial',
      color: '#ffffff'
    });

    // Description
    const description = this.scene.add.text(10, 25, upgrade.description, {
      font: '12px Arial',
      color: '#aaaaaa',
      wordWrap: { width: width - 100 }
    });

    // Cost display
    const costText = this.scene.add.text(width - 90, 10,
        `G:${upgrade.cost.gold}\nS:${upgrade.cost.steel}\nE:${upgrade.cost.energy}`, {
          font: '12px Arial',
          color: '#ffff00',
          align: 'right'
        });

    // Purchase button
    const purchaseWidth = 80;
    const purchaseHeight = 25;
    const purchaseButton = this.scene.add.rectangle(
        width - 40,
        height - 15,
        purchaseWidth,
        purchaseHeight,
        0x0066cc
    )
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x0099ff);

    const purchaseText = this.scene.add.text(
        width - 40,
        height - 15,
        'PURCHASE', {
          font: 'bold 12px Arial',
          color: '#ffffff'
        }
    ).setOrigin(0.5);

    // Check if player can afford this upgrade
    const player = gameState.getPlayerState(this.playerId);
    const canAfford = player &&
        player.resources.gold >= upgrade.cost.gold &&
        player.resources.steel >= upgrade.cost.steel &&
        player.resources.energy >= upgrade.cost.energy;

    // Check if upgrade requirements are met
    const requirementsMet = player && upgrade.requirementCheck(player);

    // If requirements aren't met, show a lock or message
    if (!requirementsMet) {
      purchaseButton.setFillStyle(0x555555);
      purchaseText.setText('LOCKED');
    }
    // If can't afford, disable the button
    else if (!canAfford) {
      purchaseButton.setFillStyle(0x885555);
      purchaseText.setText('PURCHASE');
    }
    // Otherwise, make it clickable
    else {
      purchaseButton.setInteractive()
          .on('pointerover', () => {
            purchaseButton.setFillStyle(0x4499ff);
          })
          .on('pointerout', () => {
            purchaseButton.setFillStyle(0x0066cc);
          })
          .on('pointerdown', () => {
            this.purchaseUpgrade(upgrade);
          });
    }

    container.add([bg, title, description, costText, purchaseButton, purchaseText]);
    return container;
  }

  private purchaseUpgrade(upgrade: UpgradeOption): void {
    const player = gameState.getPlayerState(this.playerId);
    if (!player) return;

    // Check again if player can afford it
    if (
        player.resources.gold >= upgrade.cost.gold &&
        player.resources.steel >= upgrade.cost.steel &&
        player.resources.energy >= upgrade.cost.energy
    ) {
      // Deduct costs
      player.resources.gold -= upgrade.cost.gold;
      player.resources.steel -= upgrade.cost.steel;
      player.resources.energy -= upgrade.cost.energy;

      // Apply upgrade effect
      upgrade.effect(this.playerId);

      // Add some points for purchasing upgrades
      player.points += 5;

      // Update UI
      this.updateStatus();
      this.createUpgradeButtons(); // Refresh buttons

      // Notify parent component
      this.onUpgradePurchased();

      // Show purchase confirmation
      this.showPurchaseConfirmation(upgrade.name);
    }
  }

  private showPurchaseConfirmation(upgradeName: string): void {
    const confirmationText = this.scene.add.text(
        this.container.x + 200,
        this.container.y + 200,
        `${upgradeName} acquired!`,
        {
          font: 'bold 18px Arial',
          color: '#00ff00'
        }
    ).setOrigin(0.5);

    // Fade out animation
    this.scene.tweens.add({
      targets: confirmationText,
      alpha: 0,
      y: confirmationText.y - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        confirmationText.destroy();
      }
    });
  }

  private updateStatus(): void {
    const player = gameState.getPlayerState(this.playerId);
    if (!player) return;

    this.statusText.setText(
        `Current Resources: Gold ${player.resources.gold} | Steel ${player.resources.steel} | Energy ${player.resources.energy}`
    );
  }

  private updateButtonStates(): void {
    // Refresh button states without recreating them completely
    this.upgradeButtons.forEach((buttonContainer, index) => {
      const upgrade = this.upgradeOptions[index];
      const player = gameState.getPlayerState(this.playerId);

      if (!player) return;

      // Find button elements
      const children = buttonContainer.getAll();
      const purchaseButton = children[4] as Phaser.GameObjects.Rectangle;
      const purchaseText = children[5] as Phaser.GameObjects.Text;

      // Check conditions
      const canAfford =
          player.resources.gold >= upgrade.cost.gold &&
          player.resources.steel >= upgrade.cost.steel &&
          player.resources.energy >= upgrade.cost.energy;

      const requirementsMet = upgrade.requirementCheck(player);

      // Update button state
      if (!requirementsMet) {
        purchaseButton.setFillStyle(0x555555);
        purchaseButton.disableInteractive();
        purchaseText.setText('LOCKED');
      }
      else if (!canAfford) {
        purchaseButton.setFillStyle(0x885555);
        purchaseButton.disableInteractive();
        purchaseText.setText('PURCHASE');
      }
      else {
        purchaseButton.setFillStyle(0x0066cc);
        if (!purchaseButton.input) {
          purchaseButton.setInteractive()
              .on('pointerover', () => {
                purchaseButton.setFillStyle(0x4499ff);
              })
              .on('pointerout', () => {
                purchaseButton.setFillStyle(0x0066cc);
              })
              .on('pointerdown', () => {
                this.purchaseUpgrade(upgrade);
              });
        }
        purchaseText.setText('PURCHASE');
      }
    });
  }
}
