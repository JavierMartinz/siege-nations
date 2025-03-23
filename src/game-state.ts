// src/gameState.ts

export interface Territory {
  id: string;
  owner: string | null;
  x: number;
  y: number;
  resources: {
    gold: number;
    steel: number;
    energy: number;
  };
  strength: number; // Defense strength
  adjacentTo: string[]; // IDs of adjacent territories
}

export interface PlayerState {
  id: string;
  name: string;
  points: number;
  conquered: string[]; // list of territory IDs
  resources: {
    gold: number;
    steel: number;
    energy: number;
  };
  strength: number; // Attack strength
  level: number;
}

export interface AttackResult {
  success: boolean;
  pointsGained: number;
  resourcesGained: {
    gold: number;
    steel: number;
    energy: number;
  };
  message: string;
}

export class GameState {
  public territories: Territory[] = [];
  public players: Map<string, PlayerState> = new Map();
  private lastResourceCollection: number = 0;
  private resourceInterval: number = 10000; // 10 seconds

  constructor() {
    // Initial setup will be done by MapScene
    this.territories = [];
  }

  // Create a territory grid with adjacency information
  createTerritoryGrid(rows: number, cols: number, startX: number, startY: number, spacingX: number, spacingY: number) {
    // Clear existing territories
    this.territories = [];

    // Generate grid
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const id = String.fromCharCode(65 + (row * cols) + col); // A, B, C, ...

        // Create territory with random resource values
        const territory: Territory = {
          id,
          owner: null,
          x: startX + (col * spacingX),
          y: startY + (row * spacingY),
          resources: {
            gold: Math.floor(Math.random() * 5) + 1,
            steel: Math.floor(Math.random() * 5) + 1,
            energy: Math.floor(Math.random() * 5) + 1
          },
          strength: 10, // Default defense strength
          adjacentTo: []
        };

        this.territories.push(territory);
      }
    }

    // Set up adjacency (using grid logic - adjacent to up, down, left, right)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const territory = this.territories[index];
        const adjacentIndices = [];

        // Up
        if (row > 0) {
          adjacentIndices.push((row - 1) * cols + col);
        }

        // Down
        if (row < rows - 1) {
          adjacentIndices.push((row + 1) * cols + col);
        }

        // Left
        if (col > 0) {
          adjacentIndices.push(row * cols + (col - 1));
        }

        // Right
        if (col < cols - 1) {
          adjacentIndices.push(row * cols + (col + 1));
        }

        // Set adjacency by ID
        territory.adjacentTo = adjacentIndices.map(i => this.territories[i].id);
      }
    }
  }

  addPlayer(id: string, name: string) {
    if (!this.players.has(id)) {
      this.players.set(id, {
        id,
        name,
        points: 0,
        conquered: [],
        resources: {
          gold: 10,
          steel: 10,
          energy: 10
        },
        strength: 20, // Base attack strength
        level: 1
      });
    }
  }

  conquerTerritory(playerId: string, territoryId: string): AttackResult {
    const player = this.players.get(playerId);
    const territory = this.territories.find(t => t.id === territoryId);

    if (!player || !territory) {
      return {
        success: false,
        pointsGained: 0,
        resourcesGained: { gold: 0, steel: 0, energy: 0 },
        message: "Player or territory not found."
      };
    }

    // Check if player already owns this territory
    if (territory.owner === playerId) {
      return {
        success: false,
        pointsGained: 0,
        resourcesGained: { gold: 0, steel: 0, energy: 0 },
        message: "You already own this territory."
      };
    }

    // Check if the territory is adjacent to one of player's territories or is neutral
    const isAdjacent = player.conquered.some(ownedId => {
      const ownedTerritory = this.territories.find(t => t.id === ownedId);
      return ownedTerritory && ownedTerritory.adjacentTo.includes(territoryId);
    });

    // First territory can be any neutral one
    const isFirstConquest = player.conquered.length === 0 && territory.owner === null;

    if (!isAdjacent && !isFirstConquest) {
      return {
        success: false,
        pointsGained: 0,
        resourcesGained: { gold: 0, steel: 0, energy: 0 },
        message: "You can only attack adjacent territories or neutral territories for your first conquest."
      };
    }

    // Calculate attack success based on strength
    let attackSuccess = true;
    let defenseStrength = territory.strength;

    // If territory is owned, add owner's strength bonus
    if (territory.owner) {
      const defender = this.players.get(territory.owner);
      if (defender) {
        defenseStrength += Math.floor(defender.strength / 4);
      }
    }

    // Basic combat resolution (can be expanded to include randomness, unit types, etc.)
    if (territory.owner !== null && player.strength < defenseStrength) {
      attackSuccess = false;

      // Attacker loses some points on failed attack
      player.points = Math.max(0, player.points - 2);

      return {
        success: false,
        pointsGained: -2,
        resourcesGained: { gold: 0, steel: 0, energy: 0 },
        message: "Attack failed! The territory's defenses were too strong."
      };
    }

    // Attack succeeded - update ownership
    const resourcesGained = { ...territory.resources };
    let pointsGained = 0;

    // If it was owned by someone else, they lose it
    if (territory.owner !== null) {
      const prevOwner = this.players.get(territory.owner);
      if (prevOwner) {
        prevOwner.conquered = prevOwner.conquered.filter(tid => tid !== territoryId);
        prevOwner.points -= 5;
        pointsGained = 15; // More points for taking from another player
      }
    } else {
      pointsGained = 10; // Points for taking neutral territory
    }

    // Update ownership
    territory.owner = playerId;
    player.points += pointsGained;

    // Add to conquered list if not already there
    if (!player.conquered.includes(territoryId)) {
      player.conquered.push(territoryId);
    }

    // Add resources from conquered territory (one-time bonus)
    player.resources.gold += resourcesGained.gold;
    player.resources.steel += resourcesGained.steel;
    player.resources.energy += resourcesGained.energy;

    // Check for level up (every 50 points)
    const newLevel = Math.floor(player.points / 50) + 1;
    if (newLevel > player.level) {
      player.level = newLevel;
      player.strength += 5; // Strength increases with level
    }

    return {
      success: true,
      pointsGained,
      resourcesGained,
      message: `Conquered territory ${territoryId}! +${pointsGained} points`
    };
  }

  getPlayerState(playerId: string): PlayerState | undefined {
    return this.players.get(playerId);
  }

  // Collect passive resources from territories (called periodically)
  collectResources(currentTime: number) {
    // Only collect resources at certain intervals
    if (currentTime - this.lastResourceCollection < this.resourceInterval) {
      return;
    }

    this.lastResourceCollection = currentTime;

    // Each player collects resources from their territories
    this.players.forEach(player => {
      const ownedTerritories = this.territories.filter(
          t => t.owner === player.id
      );

      let goldCollected = 0;
      let steelCollected = 0;
      let energyCollected = 0;

      ownedTerritories.forEach(territory => {
        goldCollected += territory.resources.gold;
        steelCollected += territory.resources.steel;
        energyCollected += territory.resources.energy;
      });

      // Add resources to player
      player.resources.gold += goldCollected;
      player.resources.steel += steelCollected;
      player.resources.energy += energyCollected;
    });
  }

  // Get suggested targets for AI
  getTargetsForAI(aiPlayerId: string): Territory[] {
    const aiPlayer = this.players.get(aiPlayerId);
    if (!aiPlayer) return [];

    const potentialTargets: Territory[] = [];

    // If AI has no territories, find an unoccupied one
    if (aiPlayer.conquered.length === 0) {
      return this.territories.filter(t => t.owner === null);
    }

    // For each owned territory, look at adjacent territories
    aiPlayer.conquered.forEach(ownedId => {
      const ownedTerritory = this.territories.find(t => t.id === ownedId);
      if (!ownedTerritory) return;

      // Find adjacent territories not owned by this AI
      ownedTerritory.adjacentTo.forEach(adjacentId => {
        const adjacentTerritory = this.territories.find(t => t.id === adjacentId);
        if (adjacentTerritory && adjacentTerritory.owner !== aiPlayerId) {
          // Prioritize unowned territories over player-owned ones
          if (adjacentTerritory.owner === null) {
            potentialTargets.unshift(adjacentTerritory);
          } else {
            potentialTargets.push(adjacentTerritory);
          }
        }
      });
    });

    return potentialTargets;
  }
}

export const gameState = new GameState();
