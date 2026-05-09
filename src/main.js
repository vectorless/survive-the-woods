import Phaser from 'phaser';
import { ForestScene } from './scenes/ForestScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { CraftScene } from './scenes/CraftScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { initState } from './state.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0d1a10',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%'
  },
  scene: [ForestScene, HUDScene, CraftScene, InventoryScene, GameOverScene]
});

initState(game.registry);
