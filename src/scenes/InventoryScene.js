import Phaser from 'phaser';

// Read-only inventory panel. Z (or ESC) opens/closes; ForestScene is paused
// while it's up so hunger/wolves/cold don't keep ticking through your menu.

const ITEMS = [
  { key: 'wood',     name: 'Wood',       color: 0x6b3a1f, draw: drawWoodIcon },
  { key: 'stone',    name: 'Stone',      color: 0x6e6e74, draw: drawStoneIcon },
  { key: 'iron',     name: 'Iron',       color: 0x5a6a7a, draw: drawIronIcon },
  { key: 'berries',  name: 'Berries',    color: 0xd1373a, draw: drawBerryIcon },
  { key: 'trailMix', name: 'Trail Mix',  color: 0xc4a47a, draw: drawTrailMixIcon },
  { key: 'mushroom', name: 'Mushroom',   color: 0xc4373a, draw: drawMushroomIcon },
  { key: 'fish',     name: 'Fish',       color: 0x4aa8d8, draw: drawFishIcon }
];

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InventoryScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setScrollFactor(0);

    const panelW = 380;
    const panelH = 520;
    this.add.rectangle(width / 2, height / 2, panelW, panelH, 0x1f2418, 0.95).setStrokeStyle(2, 0xc4734a);

    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    this.add.text(width / 2, panelY + 22, 'Inventory', {
      fontFamily: 'serif', fontSize: '24px', color: '#f4e4bc'
    }).setOrigin(0.5);
    this.add.text(width / 2, panelY + 50, 'Z or ESC to close', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c4a47a'
    }).setOrigin(0.5);

    // Equipped + tools row
    const equipped = this.registry.get('equipped');
    const tools = this.registry.get('ownedTools') || [];
    const eqLabel = equipped ? equipped.toUpperCase() : '—';
    this.add.text(panelX + 24, panelY + 84,
      `equipped: ${eqLabel}    tools: ${tools.length ? tools.join(', ') : 'none'}`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#f4d8a8'
      });

    // Item rows
    const inv = this.registry.get('inventory') || {};
    let y = panelY + 122;
    for (const item of ITEMS) {
      // icon
      item.draw(this, panelX + 40, y + 18);
      // label
      this.add.text(panelX + 80, y + 6, item.name, {
        fontFamily: 'serif', fontSize: '16px', color: '#f4e4bc'
      });
      // count
      const n = inv[item.key] || 0;
      this.add.text(panelX + panelW - 32, y + 8, `${n}`, {
        fontFamily: 'monospace', fontSize: '18px',
        color: n > 0 ? '#cfffae' : '#7a7060'
      }).setOrigin(1, 0);
      y += 50;
    }

    // Campfire status footer
    const built = this.registry.get('campfireBuilt');
    const lit = this.registry.get('campfireLit');
    const fireLine = built
      ? (lit ? 'campfire: LIT' : 'campfire: built (unlit)')
      : 'campfire: not built';
    this.add.text(width / 2, panelY + panelH - 24, fireLine, {
      fontFamily: 'monospace', fontSize: '12px', color: '#c4a47a'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-Z', () => this.close());
    this.input.keyboard.on('keydown-ESC', () => this.close());
  }

  close() {
    this.scene.stop();
    this.scene.resume('ForestScene');
  }
}

// --- Icon draw helpers ---------------------------------------------------

function drawWoodIcon(scene, x, y) {
  const log = scene.add.rectangle(x, y, 32, 12, 0x6b3a1f).setStrokeStyle(1, 0x2f1d0d);
  scene.add.circle(x - 12, y, 4, 0x8a5b3a);
  scene.add.circle(x + 12, y, 4, 0x8a5b3a);
  return log;
}

function drawStoneIcon(scene, x, y) {
  const r = scene.add.polygon(x, y,
    [-14, 4, -8, -8, 6, -10, 14, 0, 10, 8, -4, 10], 0x6e6e74);
  r.setStrokeStyle(1, 0x2e2e34);
  scene.add.polygon(x, y - 2, [-6, -4, 2, -7, 4, -2, -2, 0], 0x9a9aa2);
  return r;
}

function drawIronIcon(scene, x, y) {
  const r = scene.add.polygon(x, y,
    [-14, 4, -8, -8, 6, -10, 14, 0, 10, 8, -4, 10], 0x5a6a7a);
  r.setStrokeStyle(1, 0x1f2a36);
  scene.add.polygon(x, y - 2, [-6, -4, 2, -7, 4, -2, -2, 0], 0x9aaab8);
  scene.add.circle(x - 3, y - 3, 1.4, 0xe4ecf4);
  scene.add.circle(x + 4, y + 1, 1.2, 0xc4d4e4);
}

function drawBerryIcon(scene, x, y) {
  scene.add.circle(x - 6, y + 2, 5, 0xd1373a).setStrokeStyle(1, 0x6a1818);
  scene.add.circle(x + 5, y - 2, 5, 0xd1373a).setStrokeStyle(1, 0x6a1818);
  scene.add.circle(x + 1, y + 6, 5, 0xd1373a).setStrokeStyle(1, 0x6a1818);
}

function drawTrailMixIcon(scene, x, y) {
  scene.add.rectangle(x, y, 26, 16, 0xc4a47a).setStrokeStyle(1, 0x6a4a2a);
  scene.add.circle(x - 6, y, 2, 0xd1373a);
  scene.add.circle(x + 5, y - 2, 2, 0x6b3a1f);
  scene.add.circle(x + 2, y + 4, 2, 0xf4d8a8);
}

function drawMushroomIcon(scene, x, y) {
  scene.add.rectangle(x, y + 4, 6, 12, 0xf4e4bc).setStrokeStyle(1, 0x6a4a2a);
  scene.add.ellipse(x, y - 4, 22, 14, 0xc4373a).setStrokeStyle(1, 0x6a1818);
  scene.add.circle(x - 5, y - 6, 1.7, 0xfff4e4);
  scene.add.circle(x + 4, y - 4, 1.7, 0xfff4e4);
}

function drawFishIcon(scene, x, y) {
  scene.add.ellipse(x - 2, y, 24, 11, 0x4aa8d8).setStrokeStyle(1, 0x1a4a8a);
  scene.add.triangle(x + 12, y, 0, 0, -8, -6, -8, 6, 0x4aa8d8).setStrokeStyle(1, 0x1a4a8a);
  scene.add.circle(x - 7, y - 1, 1.6, 0x081828);
}
