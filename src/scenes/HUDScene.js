import Phaser from 'phaser';
import { TIME } from '../data/world.js';
import { MAX_BAR } from '../state.js';

const BAR_W = 200;
const BAR_H = 14;

const SLOT_W = 56;
const SLOT_H = 56;
const SLOT_GAP = 8;

// Hotbar layout — order matches numeric hotkeys 1..6 handled in ForestScene.
const HOTBAR = [
  { key: '1', kind: 'tool', tool: 'axe',      label: 'Axe' },
  { key: '2', kind: 'tool', tool: 'spear',    label: 'Spear' },
  { key: '3', kind: 'food', item: 'berries',  label: 'Berry' },
  { key: '4', kind: 'food', item: 'trailMix', label: 'Mix' },
  { key: '5', kind: 'food', item: 'mushroom', label: 'Mushroom' },
  { key: '6', kind: 'food', item: 'fish',     label: 'Fish' }
];

export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene', active: false });
  }

  create() {
    // Bars (top-left)
    this.barBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.barFg = this.add.graphics().setScrollFactor(0).setDepth(101);

    // Day clock + day count (top-right)
    this.dayText = this.add.text(0, 14, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#f4e4bc',
      align: 'right'
    }).setScrollFactor(0).setDepth(102);
    this.sun = this.add.circle(0, 0, 14, 0xffd24a).setScrollFactor(0).setDepth(102);

    // Skip-day button (top-right, hidden at night)
    this.skipBtnBg = this.add.rectangle(0, 0, 130, 30, 0x3a4a26, 0.9)
      .setStrokeStyle(2, 0x86a36a)
      .setScrollFactor(0).setDepth(102)
      .setInteractive({ useHandCursor: true });
    this.skipBtnText = this.add.text(0, 0, 'skip day  »»', {
      fontFamily: 'monospace', fontSize: '13px', color: '#cfffae'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(103);
    this.skipBtnBg.on('pointerdown', () => {
      const fs = this.scene.get('ForestScene');
      if (fs && fs.skipDaytime) fs.skipDaytime();
    });
    this.skipBtnBg.on('pointerover', () => this.skipBtnBg.setFillStyle(0x4a5a36, 0.95));
    this.skipBtnBg.on('pointerout', () => this.skipBtnBg.setFillStyle(0x3a4a26, 0.9));

    // Prompt (above hotbar)
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#fff',
      backgroundColor: '#000a', padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

    // Toast (transient feedback above prompt)
    this.toast = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffe07a',
      backgroundColor: '#000a', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(103).setVisible(false);

    this.buildHotbar();

    this.scale.on('resize', () => this.layout());
    this.layout();
  }

  buildHotbar() {
    this.slots = HOTBAR.map((def) => {
      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(102);
      const bg = this.add.rectangle(0, 0, SLOT_W, SLOT_H, 0x1f2418, 0.85)
        .setStrokeStyle(2, 0x4a5a3a);
      const keyLabel = this.add.text(-SLOT_W / 2 + 6, -SLOT_H / 2 + 4, def.key, {
        fontFamily: 'monospace', fontSize: '11px', color: '#c4a47a'
      });
      const nameLabel = this.add.text(0, SLOT_H / 2 - 12, def.label, {
        fontFamily: 'monospace', fontSize: '10px', color: '#c4a47a'
      }).setOrigin(0.5);
      const icon = this.makeSlotIcon(def);
      const count = this.add.text(SLOT_W / 2 - 6, SLOT_H / 2 - 6, '', {
        fontFamily: 'monospace', fontSize: '12px', color: '#cfffae'
      }).setOrigin(1, 1);
      c.add([bg, icon, keyLabel, nameLabel, count]);
      return { def, container: c, bg, icon, count, nameLabel, keyLabel };
    });
  }

  // Returns a small Container with a stylized icon for the slot.
  makeSlotIcon(def) {
    const g = this.add.container(0, -2);
    if (def.kind === 'tool' && def.tool === 'axe') {
      const handle = this.add.rectangle(2, 4, 4, 22, 0x6b3a1f).setRotation(0.4)
        .setStrokeStyle(1, 0x2f1d0d);
      const head = this.add.triangle(-4, -6, 0, 0, 12, -6, 12, 8, 0x9a9aa2)
        .setStrokeStyle(1, 0x2e2e34);
      g.add([handle, head]);
    } else if (def.kind === 'tool' && def.tool === 'spear') {
      const shaft = this.add.rectangle(0, 0, 3, 26, 0x6b3a1f).setRotation(0.4)
        .setStrokeStyle(1, 0x2f1d0d);
      const tip = this.add.triangle(8, -10, 0, 6, 6, 0, 6, 6, 0x9a9aa2)
        .setRotation(0.4)
        .setStrokeStyle(1, 0x2e2e34);
      g.add([shaft, tip]);
    } else if (def.kind === 'food' && def.item === 'berries') {
      g.add(this.add.circle(-5, 2, 5, 0xd1373a).setStrokeStyle(1, 0x6a1818));
      g.add(this.add.circle(5, -2, 5, 0xd1373a).setStrokeStyle(1, 0x6a1818));
      g.add(this.add.circle(0, 7, 5, 0xd1373a).setStrokeStyle(1, 0x6a1818));
    } else if (def.kind === 'food' && def.item === 'trailMix') {
      g.add(this.add.rectangle(0, 0, 26, 18, 0xc4a47a).setStrokeStyle(1, 0x6a4a2a));
      g.add(this.add.circle(-7, 0, 2, 0xd1373a));
      g.add(this.add.circle(5, -3, 2, 0x6b3a1f));
      g.add(this.add.circle(2, 5, 2, 0xf4d8a8));
    } else if (def.kind === 'food' && def.item === 'mushroom') {
      g.add(this.add.rectangle(0, 4, 5, 10, 0xf4e4bc).setStrokeStyle(1, 0x6a4a2a));
      g.add(this.add.ellipse(0, -4, 20, 12, 0xc4373a).setStrokeStyle(1, 0x6a1818));
      g.add(this.add.circle(-4, -5, 1.5, 0xfff4e4));
      g.add(this.add.circle(3, -3, 1.5, 0xfff4e4));
    } else if (def.kind === 'food' && def.item === 'fish') {
      g.add(this.add.ellipse(-2, 0, 22, 10, 0x4aa8d8).setStrokeStyle(1, 0x1a4a8a));
      g.add(this.add.triangle(11, 0, 0, 0, -8, -5, -8, 5, 0x4aa8d8).setStrokeStyle(1, 0x1a4a8a));
      g.add(this.add.circle(-7, -1, 1.4, 0x081828));
    }
    return g;
  }

  layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.dayText.setOrigin(1, 0);
    this.dayText.x = w - 20;
    this.sun.x = w - this.dayText.width - 36;
    this.sun.y = 22;

    // Skip button under the day clock
    this.skipBtnBg.x = w - 20 - 65;
    this.skipBtnBg.y = 56;
    this.skipBtnText.x = this.skipBtnBg.x;
    this.skipBtnText.y = this.skipBtnBg.y;

    // Hotbar centered along bottom
    const totalW = HOTBAR.length * SLOT_W + (HOTBAR.length - 1) * SLOT_GAP;
    const startX = (w - totalW) / 2 + SLOT_W / 2;
    const y = h - SLOT_H / 2 - 16;
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].container.x = startX + i * (SLOT_W + SLOT_GAP);
      this.slots[i].container.y = y;
    }

    // Prompt + toast sit above hotbar
    this.prompt.x = w / 2;
    this.prompt.y = h - SLOT_H - 36;
    this.toast.x = w / 2;
    this.toast.y = h - SLOT_H - 70;
  }

  update() {
    const reg = this.registry;
    const hunger = reg.get('hunger') || 0;
    const health = reg.get('health') || 0;
    const stamina = reg.get('stamina') || 0;

    this.barBg.clear();
    this.barFg.clear();
    this.drawBar(0, hunger, 0xc4734a, 'Hunger');
    this.drawBar(1, health, 0xd13a3a, 'Health');
    this.drawBar(2, stamina, 0xffd24a, 'Stamina');

    const t = reg.get('timeOfDay') || 0;
    const isNight = reg.get('isNight');
    const days = reg.get('daysSurvived') || 0;
    const phase = isNight ? 'NIGHT' : 'DAY';
    const remaining = isNight
      ? (1 - t) * TIME.dayLengthSec
      : (TIME.daylightFraction - t) * TIME.dayLengthSec;
    this.dayText.setText(`Day ${days + 1}  ·  ${phase}  ${Math.max(0, Math.ceil(remaining))}s`);

    // sun colour shifts to moon at night
    this.sun.fillColor = isNight ? 0xc8d8ff : 0xffd24a;
    this.sun.scale = isNight ? 0.85 : 1;

    // Skip button only useful during daytime
    this.skipBtnBg.setVisible(!isNight);
    this.skipBtnText.setVisible(!isNight);

    this.refreshHotbar();
    this.layout();
  }

  refreshHotbar() {
    const reg = this.registry;
    const inv = reg.get('inventory') || {};
    const owned = reg.get('ownedTools') || [];
    const equipped = reg.get('equipped');

    for (const slot of this.slots) {
      const def = slot.def;
      let available = false;
      let active = false;
      let countText = '';

      if (def.kind === 'tool') {
        available = owned.includes(def.tool);
        active = equipped === def.tool;
      } else if (def.kind === 'food') {
        const n = inv[def.item] || 0;
        available = n > 0;
        countText = n > 0 ? `${n}` : '';
      }

      // Border + fill colors reflect status
      let stroke = 0x4a5a3a;
      let fill = 0x1f2418;
      let fillAlpha = 0.85;
      if (active) { stroke = 0xffd24a; fill = 0x4a3a14; fillAlpha = 0.9; }
      else if (available) { stroke = 0x86a36a; }
      else { stroke = 0x2a2a26; fillAlpha = 0.55; }

      slot.bg.setStrokeStyle(2, stroke);
      slot.bg.setFillStyle(fill, fillAlpha);
      slot.icon.setAlpha(available ? 1 : 0.35);
      slot.nameLabel.setColor(available ? '#f4e4bc' : '#5a5040');
      slot.keyLabel.setColor(active ? '#ffd24a' : '#c4a47a');
      slot.count.setText(countText);
    }
  }

  drawBar(idx, value, color, label) {
    const x = 20;
    const y = 14 + idx * 24;
    const pct = Math.max(0, Math.min(1, value / MAX_BAR));
    this.barBg.fillStyle(0x000000, 0.55);
    this.barBg.fillRoundedRect(x - 2, y - 2, BAR_W + 4, BAR_H + 4, 4);
    this.barBg.fillStyle(0x222222, 1);
    this.barBg.fillRoundedRect(x, y, BAR_W, BAR_H, 3);
    this.barFg.fillStyle(color, 1);
    this.barFg.fillRoundedRect(x, y, BAR_W * pct, BAR_H, 3);
    if (!this[`barText${idx}`]) {
      this[`barText${idx}`] = this.add.text(x + BAR_W + 8, y - 1, '', {
        fontFamily: 'monospace', fontSize: '11px', color: '#f4d8a8'
      }).setScrollFactor(0).setDepth(102);
    }
    this[`barText${idx}`].setText(`${label}  ${Math.round(value)}`);
  }

  setPrompt(text) {
    this.prompt.setText(text || '');
    this.prompt.setVisible(!!text);
  }

  flashToast(text) {
    this.toast.setText(text);
    this.toast.setVisible(true);
    if (this._toastTimer) this._toastTimer.remove();
    this._toastTimer = this.time.delayedCall(1100, () => this.toast.setVisible(false));
  }
}
