import Phaser from 'phaser';
import { gameState, Territory, AttackResult } from '../game-state';
import { Scoreboard } from '../components/score-board';
import { TerritoryDetails } from '../components/territory-details';
import { ResourceManager } from '../components/resource-manager';

export default class MapScene extends Phaser.Scene {
  private playerId = 'player1';
  private playerName = 'Commander';
  private pointsText!: Phaser.GameObjects.Text;
  private resourcesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private aiPlayers = ['bot1', 'bot2'];
  private territoriesContainer!: Phaser.GameObjects.Container;
  private scoreboard!: Scoreboard;
  private territoryDetails!: TerritoryDetails;
  private resourceManager!: ResourceManager;
  private selectedTerritory: Territory | null = null;

  // UI elements
  private nextTurnButton!: Phaser.GameObjects.Container;
  private resourceButton!: Phaser.GameObjects.Container;
  private turnCounter: number = 1;
  private turnText!: Phaser.GameObjects.Text;
  private gameLog: string[] = [];
  private gameLogText!: Phaser.GameObjects.Text;

  // Colors for different players
  private playerColors: Record<string, number> = {
    'player1': 0x00ff00, // Green for human player
    'bot1': 0xff0000,    // Red for bot1
    'bot2': 0xff8800,    // Orange for bot2
    'neutral': 0x8888ff  // Blue for neutral
  };

  constructor() {
    super('MapScene');
  }

  create() {
    // Create background with grid pattern
    this.createBackground();

    // Title and header
    this.add.text(20, 20, 'SIEGE NATIONS: Domination & Legacy', {
      font: 'bold 28px Arial',
      color: '#ffffff',
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
    });

    // Turn counter
    this.turnText = this.add.text(20, 60, 'Turn 1', {
      font: 'bold 18px Arial',
      color: '#ffffff'
    });

    // Initialize game state with players
    gameState.addPlayer(this.playerId, this.playerName);
    this.aiPlayers.forEach((id, index) => {
      const botName = `Faction ${index + 1}`;
      gameState.addPlayer(id, botName);
    });

    // Player info display
    this.pointsText = this.add.text(20, 90, '', {
      font: '18px Arial',
      color: '#ffff00',
      shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
    });

    this.levelText = this.add.text(20, 115, '', {
      font: '16px Arial',
      color: '#ffffff'
    });

    this.resourcesText = this.add.text(20, 140, '', {
      font: '16px Arial',
      color: '#ffffff'
    });

    this.updatePlayerInfo();

    // Create container for territories
    this.territoriesContainer = this.add.container(0, 0);

    // Create territory grid
    gameState.createTerritoryGrid(3, 4, 100, 180, 150, 120);

    // Create visuals for territories
    gameState.territories.forEach((t) => {
      this.createTerritoryVisual(t);
    });

    // Initialize scoreboard (positioned on the right side)
    this.scoreboard = new Scoreboard(this, 580, 100, 200, 200);

    // Initialize territory details panel
    this.territoryDetails = new TerritoryDetails(
        this,
        580, 320,
        200, 300,
        this.playerId,
        (result) => this.handleAttackResult(result)
    );

    // Initialize resource management panel (initially hidden)
    this.resourceManager = new ResourceManager(
        this,
        100, 100,
        400, 400,
        this.playerId,
        () => this.handleUpgradePurchased()
    );

    // Game log
    this.gameLogText = this.add.text(20, 500, '', {
      font: '14px Arial',
      color: '#bbbbbb',
      wordWrap: { width: 520 },
      lineSpacing: 2
    });
    this.addToGameLog('Welcome to Siege Nations! Conquer territories to gain resources and power.');

    // Create UI buttons
    this.createNextTurnButton();
    this.createResourceButton();

    // Add a "Reset Game" button
    const resetButton = this.add.rectangle(700, 30, 80, 30, 0x990000)
        .setInteractive()
        .setOrigin(0, 0);

    resetButton.on('pointerdown', () => {
      this.resetGame();
    });

    this.add.text(710, 35, 'Reset', {
      font: '16px Arial',
      color: '#ffffff'
    }).setOrigin(0, 0);
  }

  createBackground() {
    // Fill the background
    this.add.rectangle(0, 0, 800, 600, 0x222222).setOrigin(0, 0);

    // Add grid lines
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x444444, 0.3);

    // Vertical lines
    for (let x = 0; x < 800; x += 40) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, 600);
    }

    // Horizontal lines
    for (let y = 0; y < 600; y += 40) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(800, y);
    }

    gridGraphics.strokePath();
  }

  createTerritoryVisual(territory: Territory) {
    const territoryGroup = this.add.container(territory.x, territory.y);

    // Base hexagon shape
    const hexagon = this.add.polygon(0, 0, [
      { x: 0, y: -40 },   // Top
      { x: 35, y: -20 },  // Top-right
      { x: 35, y: 20 },   // Bottom-right
      { x: 0, y: 40 },    // Bottom
      { x: -35, y: 20 },  // Bottom-left
      { x: -35, y: -20 }, // Top-left
    ], this.playerColors.neutral)
        .setStrokeStyle(2, 0xffffff, 0.5)
        .setInteractive()
        .on('pointerdown', () => {
          this.selectTerritory(territory);
        })
        .on('pointerover', () => {
          hexagon.setStrokeStyle(3, 0xffffff, 1);
        })
        .on('pointerout', () => {
          hexagon.setStrokeStyle(2, 0xffffff, 0.5);
        });

    // Territory ID label
    const label = this.add.text(0, 0, territory.id, {
      font: 'bold 20px Arial',
      color: '#000'
    }).setOrigin(0.5);

    // Resource indicator
    const totalResources = territory.resources.gold + territory.resources.steel + territory.resources.energy;
    const resourceText = this.add.text(0, -20, `R:${totalResources}`, {
      font: '12px Arial',
      color: '#fff',
      backgroundColor: '#333'
    }).setOrigin(0.5);

    // Owner indicator (initially hidden because territory is neutral)
    const ownerText = this.add.text(0, 20, '', {
      font: '12px Arial',
      color: '#fff',
      backgroundColor: '#000'
    }).setOrigin(0.5).setAlpha(0);

    // Add all elements to the group
    territoryGroup.add([hexagon, label, resourceText, ownerText]);

    // Store references to visual elements
    (territory as any).visual = {
      container: territoryGroup,
      hexagon,
      label,
      resourceText,
      ownerText
    };

    this.territoriesContainer.add(territoryGroup);
  }

  selectTerritory(territory: Territory) {
    // Hide resource panel if open
    if (this.resourceManager.visible) {
      this.resourceManager.hide();
    }

    this.selectedTerritory = territory;
    this.territoryDetails.show(territory);

    // Highlight the selected territory
    gameState.territories.forEach((t) => {
      const visual = (t as any).visual;
      if (!visual) return;

      const hexagon = visual.hexagon as Phaser.GameObjects.Polygon;

      if (t === territory) {
        hexagon.setStrokeStyle(4, 0xffffff, 1);
      } else {
        hexagon.setStrokeStyle(2, 0xffffff, 0.5);
      }
    });
  }

  updateTerritoryColors() {
    gameState.territories.forEach((t) => {
      const visual = (t as any).visual;
      if (!visual) return;

      const hexagon = visual.hexagon as Phaser.GameObjects.Polygon;
      const ownerText = visual.ownerText as Phaser.GameObjects.Text;

      if (t.owner) {
        // Set territory color based on owner
        const color = this.playerColors[t.owner] || this.playerColors.neutral;
        hexagon.setFillStyle(color);

        // Update the owner text
        const player = gameState.players.get(t.owner);
        if (player) {
          ownerText.setText(player.name.substring(0, 8));
          ownerText.setAlpha(1);
        }
      } else {
        // Neutral territory
        hexagon.setFillStyle(this.playerColors.neutral);
        ownerText.setAlpha(0);
      }
    });
  }

  updatePlayerInfo() {
    const state = gameState.getPlayerState(this.playerId);
    if (state) {
      this.pointsText.setText(`Points: ${state.points} | Territories: ${state.conquered.length}`);
      this.levelText.setText(`Level: ${state.level} | Strength: ${state.strength}`);
      this.resourcesText.setText(`Gold: ${state.resources.gold} | Steel: ${state.resources.steel} | Energy: ${state.resources.energy}`);
    }
  }

  createNextTurnButton() {
    this.nextTurnButton = this.add.container(400, 550);

    const buttonBg = this.add.rectangle(0, 0, 150, 40, 0x0088ff)
        .setOrigin(0.5, 0.5)
        .setInteractive()
        .on('pointerover', () => buttonBg.setFillStyle(0x44aaff))
        .on('pointerout', () => buttonBg.setFillStyle(0x0088ff))
        .on('pointerdown', () => this.nextTurn());

    const buttonText = this.add.text(0, 0, 'NEXT TURN', {
      font: 'bold 16px Arial',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    this.nextTurnButton.add([buttonBg, buttonText]);
  }

  createResourceButton() {
    this.resourceButton = this.add.container(580, 550);

    const buttonBg = this.add.rectangle(0, 0, 150, 40, 0x008800)
        .setOrigin(0.5, 0.5)
        .setInteractive()
        .on('pointerover', () => buttonBg.setFillStyle(0x22aa22))
        .on('pointerout', () => buttonBg.setFillStyle(0x008800))
        .on('pointerdown', () => this.toggleResourceManager());

    const buttonText = this.add.text(0, 0, 'UPGRADES', {
      font: 'bold 16px Arial',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    this.resourceButton.add([buttonBg, buttonText]);
  }

  toggleResourceManager() {
    // Hide territory details if open
    if (this.selectedTerritory) {
      this.territoryDetails.hide();
      this.selectedTerritory = null;

      // Reset territory highlighting
      gameState.territories.forEach((t) => {
        const visual = (t as any).visual;
        if (!visual) return;

        const hexagon = visual.hexagon as Phaser.GameObjects.Polygon;
        hexagon.setStrokeStyle(2, 0xffffff, 0.5);
      });
    }

    this.resourceManager.toggle();
  }

  nextTurn() {
    // Increment turn counter
    this.turnCounter++;
    this.turnText.setText(`Turn ${this.turnCounter}`);

    // Hide panels if open
    if (this.selectedTerritory) {
      this.territoryDetails.hide();
      this.selectedTerritory = null;
    }

    if (this.resourceManager.visible) {
      this.resourceManager.hide();
    }

    // AI takes its turn
    this.aiTurn();

    // Collect resources
    gameState.collectResources(this.time.now);

    // Update everything
    this.updateTerritoryColors();
    this.updatePlayerInfo();
    this.scoreboard.update();

    // Show turn summary
    this.showTurnSummary();

    // Add turn log entry
    this.addToGameLog(`Turn ${this.turnCounter} completed. Resources collected from territories.`);

    // Check for diplomatic immunity (if implemented)
    if ((gameState as any).diplomaticImmunity) {
      const diplomacy = (gameState as any).diplomaticImmunity;
      diplomacy.turnsLeft--;

      if (diplomacy.turnsLeft <= 0) {
        this.addToGameLog(`Diplomatic agreement with ${diplomacy.nonAggressorPlayer} has expired.`);
        (gameState as any).diplomaticImmunity = null;
      } else {
        this.addToGameLog(`Diplomatic agreement with ${diplomacy.nonAggressorPlayer} active for ${diplomacy.turnsLeft} more turns.`);
      }
    }

    // Check for victory conditions (optional)
    this.checkVictoryConditions();
  }

  aiTurn() {
    const aiMoves: string[] = [];

    this.aiPlayers.forEach(botId => {
      // Check if AI is under diplomatic immunity
      const immunity = (gameState as any).diplomaticImmunity;
      const isProtected = immunity &&
          immunity.nonAggressorPlayer === botId &&
          immunity.protectedPlayer === this.playerId;

      // Skip this AI's turn if under diplomatic agreement
      if (isProtected) {
        aiMoves.push(`${gameState.getPlayerState(botId)?.name} respects the diplomatic agreement and does not attack.`);
        return;
      }

      // Get potential targets for this AI
      const targets = gameState.getTargetsForAI(botId);

      if (targets.length > 0) {
        // Choose a target (prioritize neutral territories)
        const neutralTargets = targets.filter(t => t.owner === null);
        const playerTargets = targets.filter(t => t.owner === this.playerId);
        const otherAiTargets = targets.filter(t => t.owner !== null && t.owner !== this.playerId);

        // Prioritize: 1. Neutral, 2. Player, 3. Other AI
        let target;
        if (neutralTargets.length > 0) {
          target = Phaser.Math.RND.pick(neutralTargets);
        } else if (playerTargets.length > 0) {
          target = Phaser.Math.RND.pick(playerTargets);
        } else if (otherAiTargets.length > 0) {
          target = Phaser.Math.RND.pick(otherAiTargets);
        }

        if (target) {
          // Try to conquer it
          const result = gameState.conquerTerritory(botId, target.id);

          // Log the action
          if (result.success) {
            const botName = gameState.getPlayerState(botId)?.name;
            const targetOwner = target.owner ? gameState.getPlayerState(target.owner)?.name : 'neutral';

            aiMoves.push(`${botName} conquered territory ${target.id} from ${targetOwner}.`);
          }
        }
      }
    });

    // Add AI moves to the game log
    if (aiMoves.length > 0) {
      aiMoves.forEach(move => this.addToGameLog(move));
    } else {
      this.addToGameLog("The enemy factions were unable to make any moves this turn.");
    }
  }

  handleAttackResult(result: AttackResult) {
    // Update visuals after an attack
    this.updateTerritoryColors();
    this.updatePlayerInfo();
    this.scoreboard.update();

    // Add to log
    this.addToGameLog(result.message);
  }

  handleUpgradePurchased() {
    // Update player info after purchasing upgrade
    this.updatePlayerInfo();
  }

  showTurnSummary() {
    // Create a summary popup
    const summary = this.add.container(400, 300);

    const bg = this.add.rectangle(0, 0, 300, 150, 0x000000, 0.8)
        .setOrigin(0.5, 0.5);

    const headerText = this.add.text(0, -50, `Turn ${this.turnCounter} Summary`, {
      font: 'bold 22px Arial',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    // Get player stats
    const player = gameState.getPlayerState(this.playerId);

    let summaryText = '';
    if (player) {
      summaryText = `Territories: ${player.conquered.length}\nResources Collected\nGold: +${player.conquered.length * 2}\nSteel: +${player.conquered.length * 2}\nEnergy: +${player.conquered.length * 2}`;
    }

    const statsText = this.add.text(0, 10, summaryText, {
      font: '16px Arial',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5, 0.5);

    summary.add([bg, headerText, statsText]);

    // Fade out after a moment
    this.tweens.add({
      targets: summary,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      delay: 1500,
      onComplete: () => {
        summary.destroy();
      }
    });
  }

  addToGameLog(message: string) {
    // Add message to log array (keep only the last 5 messages)
    this.gameLog.push(message);
    if (this.gameLog.length > 5) {
      this.gameLog.shift();
    }

    // Update the display
    this.gameLogText.setText(this.gameLog.join('\n'));
  }

  checkVictoryConditions() {
    const playerState = gameState.getPlayerState(this.playerId);
    if (!playerState) return;

    // Check if player has conquered all territories
    const allTerritories = gameState.territories.length;
    const playerTerritories = playerState.conquered.length;

    if (playerTerritories === allTerritories) {
      this.showVictoryScreen("Complete Domination", "You have conquered the entire map!");
    }
    // Check if player has reached a high score threshold
    else if (playerState.points >= 200) {
      this.showVictoryScreen("Economic Victory", "Your nation has become a dominant world power!");
    }
    // Check if player has reached a high level
    else if (playerState.level >= 5) {
      this.showVictoryScreen("Technological Victory", "Your advanced civilization leads the world!");
    }

    // Check for defeat conditions
    const botStates = this.aiPlayers.map(id => gameState.getPlayerState(id));
    const dominantBot = botStates.find(bot => bot && bot.conquered.length >= allTerritories * 0.75);

    if (dominantBot && playerTerritories === 0) {
      this.showDefeatScreen(`${dominantBot.name} has completely eliminated your nation!`);
    }
  }

  showVictoryScreen(title: string, description: string) {
    // Create victory overlay
    const overlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.8)
        .setOrigin(0, 0);

    const victoryContainer = this.add.container(400, 300);

    const titleText = this.add.text(0, -100, "VICTORY!", {
      font: 'bold 48px Arial',
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    const typeText = this.add.text(0, -40, title, {
      font: 'bold 28px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const descriptionText = this.add.text(0, 20, description, {
      font: '18px Arial',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 500 }
    }).setOrigin(0.5);

    const statsText = this.add.text(0, 80, this.getPlayerStatsText(), {
      font: '16px Arial',
      color: '#bbbbbb',
      align: 'center'
    }).setOrigin(0.5);

    const continueButton = this.add.rectangle(0, 160, 200, 50, 0x0088ff)
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
          victoryContainer.destroy();
          overlay.destroy();
        });

    const continueText = this.add.text(0, 160, "CONTINUE PLAYING", {
      font: 'bold 16px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    victoryContainer.add([titleText, typeText, descriptionText, statsText, continueButton, continueText]);

    // Add particle effects for victory
    const particles = this.add.particles(0, 0, 'particle', {
      frame: '',
      lifespan: 2000,
      speed: { min: 100, max: 200 },
      scale: { start: 0.5, end: 0 },
      quantity: 2,
      blendMode: 'ADD',
      emitting: true
    });

    // Need to create a particle texture at runtime since we don't have assets loaded
    const particleTexture = this.add.graphics();
    particleTexture.fillStyle(0xffff00, 1);
    particleTexture.fillCircle(25, 25, 10);
    particleTexture.generateTexture('particle', 50, 50);

    // Add emitters
    const emitter = particles.createEmitter({
      x: 400,
      y: 200,
      angle: { min: 0, max: 360 },
      speed: { min: 100, max: 300 },
      gravityY: 100,
      lifespan: 3000,
      quantity: 1,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffff00, 0xff9900, 0xff0000]
    });
  }

  showDefeatScreen(message: string) {
    // Create defeat overlay
    const overlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.9)
        .setOrigin(0, 0);

    const defeatContainer = this.add.container(400, 300);

    const titleText = this.add.text(0, -80, "DEFEAT", {
      font: 'bold 48px Arial',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    const messageText = this.add.text(0, -20, message, {
      font: '22px Arial',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 500 }
    }).setOrigin(0.5);

    const statsText = this.add.text(0, 50, `You survived for ${this.turnCounter} turns.\n${this.getPlayerStatsText()}`, {
      font: '16px Arial',
      color: '#bbbbbb',
      align: 'center'
    }).setOrigin(0.5);

    const restartButton = this.add.rectangle(0, 120, 200, 50, 0x880000)
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
          this.resetGame();
          defeatContainer.destroy();
          overlay.destroy();
        });

    const restartText = this.add.text(0, 120, "START NEW GAME", {
      font: 'bold 16px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    defeatContainer.add([titleText, messageText, statsText, restartButton, restartText]);
  }

  getPlayerStatsText(): string {
    const player = gameState.getPlayerState(this.playerId);
    if (!player) return '';

    return `Final Score: ${player.points}\nTerritories Conquered: ${player.conquered.length}\nLevel Reached: ${player.level}`;
  }

  resetGame() {
    // Reset all territories to neutral
    gameState.territories.forEach(territory => {
      territory.owner = null;
    });

    // Reset player scores and conquered territories
    gameState.players.forEach(player => {
      player.points = 0;
      player.conquered = [];
      player.level = 1;
      player.resources = { gold: 10, steel: 10, energy: 10 };
      player.strength = 20;
    });

    // Reset turn counter
    this.turnCounter = 1;
    this.turnText.setText(`Turn ${this.turnCounter}`);

    // Reset game log
    this.gameLog = [];
    this.addToGameLog('New game started! Conquer territories to gain resources and power.');

    // Clear diplomatic agreements
    (gameState as any).diplomaticImmunity = null;

    // Update visuals
    this.updateTerritoryColors();
    this.updatePlayerInfo();
    this.scoreboard.update();

    // Hide territory details if shown
    if (this.selectedTerritory) {
      this.territoryDetails.hide();
      this.selectedTerritory = null;
    }

    // Hide resource manager if shown
    if (this.resourceManager.visible) {
      this.resourceManager.hide();
    }
  }
}
