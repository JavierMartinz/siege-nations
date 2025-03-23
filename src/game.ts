import Phaser from 'phaser';
import MapScene from './scenes/MapScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [MapScene],
  parent: 'game',
  backgroundColor: '#222',
};

export default new Phaser.Game(config);