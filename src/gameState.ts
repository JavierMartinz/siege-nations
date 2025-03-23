// src/gameState.ts

export interface Territory {
  id: string;
  owner: string | null;
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  name: string;
  points: number;
  conquered: string[]; // list of territory IDs
}

export class GameState {
  public territories: Territory[] = [];
  public players: Map<string, PlayerState> = new Map();

  constructor() {
    this.territories = [
      { id: 'A', owner: null, x: 100, y: 200 },
      { id: 'B', owner: null, x: 300, y: 200 },
      { id: 'C', owner: null, x: 500, y: 200 },
    ];
  }

  addPlayer(id: string, name: string) {
    if (!this.players.has(id)) {
      this.players.set(id, { id, name, points: 0, conquered: [] });
    }
  }

  conquerTerritory(playerId: string, territoryId: string) {
    const player = this.players.get(playerId);
    const territory = this.territories.find(t => t.id === territoryId);

    if (player && territory && territory.owner !== playerId) {
      // Give points only if newly conquered
      if (territory.owner !== null) {
        const prevOwner = this.players.get(territory.owner);
        if (prevOwner) {
          prevOwner.conquered = prevOwner.conquered.filter(tid => tid !== territoryId);
          prevOwner.points -= 5;
        }
      }

      territory.owner = playerId;
      player.points += 10;
      if (!player.conquered.includes(territoryId)) {
        player.conquered.push(territoryId);
      }
    }
  }

  getPlayerState(playerId: string): PlayerState | undefined {
    return this.players.get(playerId);
  }
}

export const gameState = new GameState();