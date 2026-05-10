import Phaser from 'phaser';
import { RECIPES, RECIPES_ORDER } from '../data/recipes.js';
import { canCraft, craft, ownsTool, getItem } from '../state.js';

export class CraftScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CraftScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setScrollFactor(0);

    const panelW = 480;
    const panelH = 520;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;
    const panel = this.add.rectangle(width / 2, height / 2, panelW, panelH, 0x1f2418, 0.95).setStrokeStyle(2, 0xc4734a);

    this.add.text(width / 2, panelY + 22, 'Workbench', {
      fontFamily: 'serif', fontSize: '24px', color: '#f4e4bc'
    }).setOrigin(0.5);
    this.add.text(width / 2, panelY + 50, 'Click a recipe to craft  ·  ESC to close', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c4a47a'
    }).setOrigin(0.5);

    // Inventory summary
    this.invText = this.add.text(panelX + 24, panelY + panelH - 64, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#f4e4bc'
    });

    this.cards = [];
    let cardY = panelY + 86;
    for (const id of RECIPES_ORDER) {
      const card = this.makeCard(id, panelX + 24, cardY, panelW - 48);
      this.cards.push(card);
      cardY += 64;
    }

    this.input.keyboard.once('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-E', () => this.close()); // E also exits, mirrors the open key

    this.refreshAll();
    this.scale.on('resize', () => this.refreshAll());
  }

  makeCard(id, x, y, w) {
    const recipe = RECIPES[id];
    const bg = this.add.rectangle(x, y, w, 56, 0x303a26).setOrigin(0, 0).setStrokeStyle(2, 0x4a5a3a).setInteractive({ useHandCursor: true });
    const title = this.add.text(x + 12, y + 8, recipe.name, {
      fontFamily: 'serif', fontSize: '16px', color: '#f4e4bc'
    });
    const desc = this.add.text(x + 12, y + 30, recipe.desc, {
      fontFamily: 'monospace', fontSize: '11px', color: '#c4a47a',
      wordWrap: { width: w - 160 }
    });
    const cost = this.add.text(x + w - 12, y + 28, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#f4d8a8'
    }).setOrigin(1, 0.5);

    bg.on('pointerdown', () => this.tryCraft(id));
    bg.on('pointerover', () => { if (this.cardEnabled[id]) bg.setFillStyle(0x42532f, 1); });
    bg.on('pointerout', () => { if (this.cardEnabled[id]) bg.setFillStyle(0x303a26, 1); });
    return { id, bg, title, desc, cost };
  }

  cardEnabled = {};

  tryCraft(id) {
    if (!canCraft(this.registry, id)) return;
    craft(this.registry, id);
    // Auto-equip newly crafted tools so the player isn't confused.
    const recipe = RECIPES[id];
    if (recipe.tool) this.registry.set('equipped', recipe.tool);
    this.refreshAll();
  }

  refreshAll() {
    const inv = this.registry.get('inventory') || {};
    this.invText.setText(
      `wood ${inv.wood||0}  stone ${inv.stone||0}  iron ${inv.iron||0}  diamond ${inv.diamond||0}  berries ${inv.berries||0}  mix ${inv.trailMix||0}`
    );
    for (const card of this.cards) {
      const recipe = RECIPES[card.id];
      const owned = recipe.tool && ownsTool(this.registry, recipe.tool);
      const built = recipe.flag && this.registry.get(recipe.flag);
      const can = canCraft(this.registry, card.id);

      const costStr = Object.entries(recipe.cost)
        .map(([k, n]) => `${k} ${getItem(this.registry, k)}/${n}`)
        .join('   ');
      let suffix = '';
      if (owned) suffix = '  · OWNED';
      else if (built) suffix = '  · BUILT';
      card.cost.setText(costStr + suffix);

      const enabled = can;
      this.cardEnabled[card.id] = enabled;
      card.bg.setFillStyle(enabled ? 0x303a26 : 0x222a1a, 1);
      card.bg.setStrokeStyle(2, enabled ? 0x86a36a : 0x3a4530);
      card.title.setColor(enabled ? '#f4e4bc' : '#7a7060');
      card.desc.setColor(enabled ? '#c4a47a' : '#5a5040');
      card.cost.setColor(enabled ? '#cfffae' : '#7a7060');
    }
  }

  close() {
    this.scene.stop();
    this.scene.resume('ForestScene');
  }
}
