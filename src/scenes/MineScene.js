import Phaser from 'phaser';
import {
  MINE, COSTS, INTERACT_RADIUS, SPRINT_MULT, CRYSTAL_ROLL
} from '../data/world.js';
import {
  drawPlayer, drawMineGround, drawMineRock, drawCrystalPod, drawMineExit, mulberry32
} from '../world/forestRender.js';
import { WalkController } from '../controllers/WalkController.js';
import {
  adjustStamina, addItem, hasStamina
} from '../state.js';

// MineScene — vertical scrolling shaft. Launched from ForestScene when the
// player presses E on the built mine entrance. ForestScene is paused, so
// hunger/wolves/time freeze while you're underground.
export class MineScene extends Phaser.Scene {
  constructor() { super({ key: 'MineScene' }); }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#0a0805');
    cam.setBounds(0, 0, MINE.width, MINE.height);

    // Seed once on first ever entry, then keep it stable through the run so
    // the layout doesn't reshuffle if you walk back up and re-enter.
    let seed = this.registry.get('mineSeed');
    if (!seed) {
      seed = Math.floor(Math.random() * 1e9) || 1;
      this.registry.set('mineSeed', seed);
    }

    drawMineGround(this, MINE.width, MINE.height, seed);

    // Exit ladder at the top
    this.exit = drawMineExit(this, MINE.width / 2, MINE.shaftTop);

    const rng = mulberry32(seed);
    this.rocks       = this.spawnInMine(rng, MINE.rockCount, 'mineRock', drawMineRock);
    this.crystalPods = this.spawnInMine(rng, MINE.crystalPodCount, 'crystalPod', drawCrystalPod);

    // Player drops in just below the ladder.
    this.player = drawPlayer(this, MINE.width / 2, MINE.shaftTop + 80);
    this.controller = new WalkController(this, this.player);
    cam.startFollow(this.player, true, 0.15, 0.15);

    // Torchlight vignette — a near-opaque rectangle covering the mine, with a
    // circular hole around the player carved out by an inverted geometry mask.
    this.darkOverlay = this.add.rectangle(
      MINE.width / 2, MINE.height / 2,
      MINE.width, MINE.height,
      0x000000, 0.96
    ).setDepth(60);
    this.torchShape = this.add.circle(this.player.x, this.player.y, MINE.visionRadius, 0xffffff)
      .setVisible(false);
    const torchMask = this.torchShape.createGeometryMask();
    torchMask.invertAlpha = true;
    this.darkOverlay.setMask(torchMask);

    this.keys = this.input.keyboard.addKeys({ sprint: 'SHIFT' });
    this.input.keyboard.on('keydown-E', () => this.handleInteract());
    this.input.keyboard.on('keydown-ESC', () => this.exitMine());
    this.input.keyboard.on('keydown-Z', () => {
      this.scene.pause();
      this.scene.launch('InventoryScene');
    });

    this.target = null;
    this.targetRing = this.add.circle(0, 0, 28, 0xffffff, 0)
      .setStrokeStyle(2, 0xffffaa, 0.85).setDepth(7).setVisible(false);

    this.hud = this.scene.get('HUDScene');
    this.hud.setPrompt('You stand at the bottom of the ladder. WASD descend · E to interact · ESC climb out');
  }

  // Scatter resources between just-below-the-ladder and the bottom.
  spawnInMine(rng, count, kind, drawFn) {
    const list = [];
    const margin = 60;
    const minY = MINE.shaftTop + 200;
    const pad = MINE.spawnPad;
    const attemptCap = count * 80;
    let attempts = 0;
    while (list.length < count && attempts < attemptCap) {
      attempts++;
      const x = margin + rng() * (MINE.width - margin * 2);
      const y = minY + rng() * (MINE.height - minY - margin);
      let ok = true;
      for (const r of list) {
        if (Math.hypot(x - r.x, y - r.y) < pad) { ok = false; break; }
      }
      if (!ok) continue;
      const visual = drawFn(this, x, y);
      list.push({ kind, x, y, visual, depleted: false });
    }
    return list;
  }

  update(time, deltaMs) {
    this.tickSprintFlag();
    this.controller.update(deltaMs);
    // Stamina regen still ticks while underground so you can keep mining.
    const dt = deltaMs / 1000;
    if (this._sprinting) adjustStamina(this.registry, -30 * dt);
    else adjustStamina(this.registry, 22 * dt);
    // Torch follows the player.
    this.torchShape.x = this.player.x;
    this.torchShape.y = this.player.y;
    this.refreshTarget();
  }

  tickSprintFlag() {
    const sprintHeld = this.keys.sprint.isDown;
    const moving = this.controller.moving;
    // Sprint never blocks on empty stamina — bar just clamps at 0.
    const canSprint = sprintHeld && moving;
    this.registry.set('sprintMult', canSprint ? SPRINT_MULT : 1);
    this._sprinting = canSprint;
  }

  // --- Targeting + interact ----------------------------------------------

  refreshTarget() {
    const px = this.player.x, py = this.player.y;
    let best = null;
    let bestDist = INTERACT_RADIUS;

    // Exit ladder
    const ed = Math.hypot(px - MINE.width / 2, py - MINE.shaftTop);
    if (ed <= INTERACT_RADIUS + 8 && ed < bestDist) {
      best = { kind: 'mineExit', x: MINE.width / 2, y: MINE.shaftTop - 32 };
      bestDist = ed;
    }

    for (const r of [...this.rocks, ...this.crystalPods]) {
      if (r.depleted) continue;
      const d = Math.hypot(px - r.x, py - r.y);
      if (d <= INTERACT_RADIUS && d < bestDist) {
        best = { kind: r.kind, x: r.x, y: r.y - 16, ref: r };
        bestDist = d;
      }
    }

    this.target = best;
    if (best) {
      this.targetRing.setVisible(true);
      this.targetRing.x = best.x;
      this.targetRing.y = best.y + 16;
    } else {
      this.targetRing.setVisible(false);
    }

    this.hud.setPrompt(this.promptFor(best));
  }

  promptFor(t) {
    if (!t) return 'WASD move · Shift sprint · Z inventory · ESC climb out';
    switch (t.kind) {
      case 'mineExit': return 'E climb back to the surface';
      case 'mineRock': return 'E mine stone';
      case 'crystalPod': return 'E crack the crystal pod';
      default: return '';
    }
  }

  handleInteract() {
    const t = this.target;
    if (!t) return;
    if (t.kind === 'mineExit') return this.exitMine();
    if (t.kind === 'mineRock') return this.mineRock(t.ref);
    if (t.kind === 'crystalPod') return this.breakCrystalPod(t.ref);
  }

  // --- Resource actions ---------------------------------------------------

  mineRock(r) {
    if (r.depleted) return;
    if (!hasStamina(this.registry, COSTS.mineRock)) {
      this.hud.flashToast('too tired');
      return;
    }
    adjustStamina(this.registry, -COSTS.mineRock);
    addItem(this.registry, 'stone', 1);
    r.depleted = true;
    r.visual.setVisible(false);
    this.burstParticles(r.x, r.y, {
      colors: [0x4a4250, 0x7a6e84, 0x14101a], count: 22, size: 4, speed: 150
    });
    this.hud.flashToast('+1 stone');
  }

  // 50/30/20 weighted roll defined in CRYSTAL_ROLL.
  rollCrystal() {
    const r = Math.random();
    let acc = 0;
    for (const entry of CRYSTAL_ROLL) {
      acc += entry.chance;
      if (r < acc) return entry;
    }
    return CRYSTAL_ROLL[CRYSTAL_ROLL.length - 1];
  }

  breakCrystalPod(p) {
    if (p.depleted) return;
    if (!hasStamina(this.registry, COSTS.mineRock)) {
      this.hud.flashToast('too tired');
      return;
    }
    adjustStamina(this.registry, -COSTS.mineRock);
    const pick = this.rollCrystal();
    addItem(this.registry, pick.key, 1);
    p.depleted = true;
    p.visual.setVisible(false);
    this.burstParticles(p.x, p.y, {
      colors: [pick.color, 0xffffff, 0xfff4e4],
      count: 44, size: 4, speed: 200, life: 750
    });
    const r = (pick.color >> 16) & 0xff;
    const g = (pick.color >> 8) & 0xff;
    const b = pick.color & 0xff;
    this.cameras.main.flash(180, r, g, b);
    this.hud.flashToast(`+1 ${pick.name} crystal!`);
  }

  exitMine() {
    this.hud.setPrompt('');
    this.scene.stop();
    this.scene.resume('ForestScene');
  }

  // Same particle helper as ForestScene — small graphics circles tweened out.
  // Kept here so MineScene doesn't have to reach into a sibling.
  burstParticles(x, y, opts = {}) {
    const count = Math.max(1, Math.round((opts.count || 10) * 2.5));
    const colors = opts.colors || [0xffffff];
    const speed = opts.speed || 110;
    const life = opts.life || 480;
    const size = opts.size || 3;
    const drift = opts.drift || -16;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.7);
      const vx = Math.cos(angle) * v;
      const vy = Math.sin(angle) * v;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const r = Math.max(1, size + (Math.random() - 0.5) * 2);
      const p = this.add.circle(x, y, r, color);
      p.setDepth(8);
      this.tweens.add({
        targets: p,
        x: x + vx * (life / 1000),
        y: y + vy * (life / 1000) + drift,
        alpha: 0,
        scale: 0.4,
        duration: life,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }
}
