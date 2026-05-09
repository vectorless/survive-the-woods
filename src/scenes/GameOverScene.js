import Phaser from 'phaser';
import { resetState } from '../state.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.days = data?.days ?? 0;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0);

    this.add.text(width / 2, height / 2 - 60, 'You did not survive.', {
      fontFamily: 'serif', fontSize: '32px', color: '#d13a3a'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `You lasted ${this.days} day${this.days === 1 ? '' : 's'} in the woods.`, {
      fontFamily: 'serif', fontSize: '20px', color: '#f4e4bc'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 60, 'Press SPACE to try again', {
      fontFamily: 'monospace', fontSize: '14px', color: '#c4a47a'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => this.restart());
  }

  restart() {
    resetState(this.registry);
    this.scene.stop('HUDScene');
    this.scene.start('ForestScene');
  }
}
