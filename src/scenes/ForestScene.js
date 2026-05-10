import Phaser from 'phaser';
import {
  WORLD, TIME, RATES, COSTS, FOOD, MUSHROOM, REGROW_MS, BUILDING, WOLF_SCALE,
  IRON_ROCK_CHANCE,
  TREE_HP, INTERACT_RADIUS, SPRINT_MULT,
  WOLF_SPAWN_GAP_SEC, WOLF_NIGHT_INITIAL_DELAY_SEC, WOLF_MAX_ALIVE
} from '../data/world.js';
import { WOLF, BOSS } from '../data/animals.js';
import {
  drawGround, drawTent, drawTree, drawStump, drawBush, drawRock, drawIronRock,
  drawStick, drawMushroom,
  drawPond, drawCampfire, drawWolf, drawBoss, drawPlayer, makeNightOverlay, makeWarmHalo, mulberry32,
  drawRoom, drawMetalRoom, drawDiamondRoom, drawGhostRoom
} from '../world/forestRender.js';
import { WalkController } from '../controllers/WalkController.js';
import {
  adjustHunger, adjustHealth, adjustStamina, hasStamina,
  addItem, removeItem, getItem, ownsTool, equipTool, resetState
} from '../state.js';

const DUSK_FRACTION = TIME.duskFraction;

export class ForestScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ForestScene' });
  }

  create() {
    if (!this.scene.isActive('HUDScene')) this.scene.launch('HUDScene');
    this.hud = this.scene.get('HUDScene');

    // If returning from GameOver, the scene gets recreated — make sure state
    // is fresh. (GameOverScene resets registry before restart, but be safe.)
    if (this.registry.get('gameOver')) resetState(this.registry);

    const cam = this.cameras.main;
    cam.setBackgroundColor('#0d1a10');
    cam.setBounds(0, 0, WORLD.width, WORLD.height);

    const seed = this.registry.get('worldSeed');
    drawGround(this, WORLD.width, WORLD.height, seed);

    // Tent
    this.tent = drawTent(this, WORLD.tent.x, WORLD.tent.y);

    // Campfire — drawn always, flames toggled with lit state
    this.warmHalo = makeWarmHalo(this, WORLD.campfire.x, WORLD.campfire.y, WORLD.campfire.warmRadius);
    this.campfire = drawCampfire(this, WORLD.campfire.x, WORLD.campfire.y);
    this.campfire.container.setVisible(false); // appears once built

    // Resources — bushes, trees, rocks, sticks, deterministically scattered
    const rng = mulberry32(seed);
    // Ponds first — they're large, so other resources need to spawn AROUND them.
    this.ponds = this.spawnResources(rng, WORLD.pondCount, 'pond', drawPond, { minDist: 320 });
    const pondObstacles = this.ponds.map(p => ({ x: p.x, y: p.y, r: 110 }));

    this.bushes    = this.spawnResources(rng, WORLD.bushCount, 'bush', drawBush, { obstacles: pondObstacles });
    this.trees     = this.spawnResources(rng, WORLD.treeCount, 'tree', drawTree, { obstacles: pondObstacles });
    this.rocks     = this.spawnResources(rng, WORLD.rockCount, 'rock', drawRock, { obstacles: pondObstacles });
    // Re-roll a fraction of the rocks as iron — same shape, recoloured visual.
    for (const r of this.rocks) {
      if (rng() < IRON_ROCK_CHANCE) {
        r.isIron = true;
        r.visual.destroy();
        r.visual = drawIronRock(this, r.x, r.y);
      }
    }
    this.sticks    = this.spawnResources(rng, WORLD.stickCount, 'stick', drawStick, { obstacles: pondObstacles });
    this.mushrooms = this.spawnResources(rng, WORLD.mushroomCount, 'mushroom', drawMushroom, { obstacles: pondObstacles });

    // Pre-make stump sprites, one per tree, hidden until felled.
    for (const t of this.trees) {
      t.stumpVisual = drawStump(this, t.x, t.y);
      t.hp = TREE_HP;
    }

    // Wolves group (just an array — bosses live here too with isBoss: true)
    this.wolves = [];
    this.wolfSpawnCooldown = 0;
    this.lastNightFlag = false;
    this.wolvesSpawnedThisNight = 0;
    this.bossesSpawnedThisNight = 0;

    // Player
    this.player = drawPlayer(this, WORLD.tent.x, WORLD.tent.y + 80);
    this.controller = new WalkController(this, this.player);
    cam.startFollow(this.player, true, 0.15, 0.15);

    // Night overlay
    this.nightOverlay = makeNightOverlay(this, WORLD.width, WORLD.height);

    // Input
    this.keys = this.input.keyboard.addKeys({
      interact: 'E',
      sprint: 'SHIFT',
      eat: 'Q',
      slot1: 'ONE',
      slot2: 'TWO'
    });
    this.input.keyboard.on('keydown-E', () => this.handleInteract());
    this.input.keyboard.on('keydown-Q', () => this.handleEat());
    this.input.keyboard.on('keydown-ONE', () => this.activateSlot('axe'));
    this.input.keyboard.on('keydown-TWO', () => this.activateSlot('spear'));
    this.input.keyboard.on('keydown-THREE', () => this.eatItem('berries'));
    this.input.keyboard.on('keydown-FOUR', () => this.eatItem('trailMix'));
    this.input.keyboard.on('keydown-FIVE', () => this.eatMushroom());
    this.input.keyboard.on('keydown-SIX', () => this.eatItem('fish'));
    this.input.keyboard.on('keydown-Z', () => {
      this.scene.pause();
      this.scene.launch('InventoryScene');
    });

    // Currently-highlighted interactable target (set each tick)
    this.target = null;
    this.targetRing = this.add.circle(0, 0, 28, 0xffffff, 0).setStrokeStyle(2, 0xffffaa, 0.85).setDepth(7).setVisible(false);

    // Building mode — F toggles, SPACE places, TAB switches material.
    this.buildingMode = false;
    this.currentRoomType = 'wood'; // 'wood' | 'metal' | 'diamond'
    this.rooms = new Map();
    this.ghostRoom = drawGhostRoom(this, BUILDING.cellSize);
    this.input.keyboard.addCapture('TAB'); // stop browser stealing focus
    this.input.keyboard.on('keydown-F', () => this.toggleBuildingMode());
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.buildingMode) this.tryPlaceRoom();
    });
    this.input.keyboard.on('keydown-TAB', () => {
      if (!this.buildingMode) return;
      const cycle = ['wood', 'metal', 'diamond'];
      const i = cycle.indexOf(this.currentRoomType);
      this.currentRoomType = cycle[(i + 1) % cycle.length];
      this.hud.flashToast(`build: ${this.currentRoomType}`);
    });
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.buildingMode) this.toggleBuildingMode();
    });

    // Resume cleanly if we were paused by CraftScene
    this.events.on('resume', () => {
      // nothing special — input handlers are intact
    });
  }

  // --- World spawn helpers -------------------------------------------------

  // opts.minDist  — min distance between two of THIS kind (default = world default)
  // opts.obstacles — array of { x, y, r } circles this kind must avoid (e.g., ponds)
  spawnResources(rng, count, kind, drawFn, opts = {}) {
    const list = [];
    const tx = WORLD.tent.x, ty = WORLD.tent.y;
    const padTent = WORLD.spawnPadFromTent;
    const padOther = opts.minDist ?? WORLD.spawnPadFromEachOther;
    const obstacles = opts.obstacles || [];
    const margin = 80;
    let attempts = 0;
    while (list.length < count && attempts < count * 80) {
      attempts++;
      const x = margin + rng() * (WORLD.width - margin * 2);
      const y = margin + rng() * (WORLD.height - margin * 2);
      if (Math.hypot(x - tx, y - ty) < padTent) continue;
      let ok = true;
      for (const r of list) {
        if (Math.hypot(x - r.x, y - r.y) < padOther) { ok = false; break; }
      }
      if (!ok) continue;
      for (const o of obstacles) {
        if (Math.hypot(x - o.x, y - o.y) < o.r) { ok = false; break; }
      }
      if (!ok) continue;
      const visual = drawFn(this, x, y);
      list.push({
        kind,
        x, y,
        visual,
        depleted: false,
        respawnAt: 0
      });
    }
    return list;
  }

  // --- Per-frame -----------------------------------------------------------

  update(time, deltaMs) {
    if (this.registry.get('gameOver')) return;
    const dt = deltaMs / 1000;

    this.tickSprintFlag();
    this.controller.update(deltaMs);
    this.tickPondCollision();
    this.tickStamina(dt);
    this.tickHunger(dt);
    this.tickTime(dt);
    this.tickRegrowth(time);
    this.tickCampfireFlicker(time);
    this.tickCampfireEmbers(time);
    this.tickTentHeal(dt);
    this.tickWolves(dt);
    this.tickBuildingGhost();
    this.tickSprintDust(time);
    this.refreshTarget();

    if ((this.registry.get('health') || 0) <= 0) {
      this.die();
    }
  }

  // --- Sub-ticks -----------------------------------------------------------

  tickSprintFlag() {
    const sprintHeld = this.keys.sprint.isDown;
    const moving = this.controller.moving;
    const canSprint = sprintHeld && moving && (this.registry.get('stamina') || 0) > 0;
    this.registry.set('sprintMult', canSprint ? SPRINT_MULT : 1);
    this._sprinting = canSprint;
  }

  // After each move, snap the player back to the pond edge if they walked
  // into the water. The semi-axes match the deep-water ellipse in drawPond
  // (156×104) plus the player's body radius — so the player visibly stops at
  // the bank rather than poking into the water.
  tickPondCollision() {
    const rx = 90, ry = 64;
    const now = this.time?.now || 0;
    for (const p of this.ponds) {
      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const k = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (k >= 1) {
        p._wasBumping = false;
        continue;
      }
      if (k <= 0) {
        this.player.x = p.x + rx;
        continue;
      }
      const s = 1 / Math.sqrt(k);
      this.player.x = p.x + dx * s;
      this.player.y = p.y + dy * s;
      // Splash on first contact (and rate-limit if they hold against the wall).
      if (!p._wasBumping || now - (p._lastSplashAt || 0) > 350) {
        p._lastSplashAt = now;
        this.burstParticles(this.player.x, this.player.y, { colors: [0x4aa8d8, 0xc4e4f8], count: 12, size: 3, speed: 80, life: 420, drift: -10 });
      }
      p._wasBumping = true;
    }
  }

  tickStamina(dt) {
    if (this._sprinting) {
      adjustStamina(this.registry, -RATES.staminaSprintDrain * dt);
    } else {
      adjustStamina(this.registry, RATES.staminaRegen * dt);
    }
  }

  tickHunger(dt) {
    adjustHunger(this.registry, -RATES.hungerDrain * dt);
  }

  tickTime(dt) {
    let t = (this.registry.get('timeOfDay') || 0) + dt / TIME.dayLengthSec;
    if (t >= 1) {
      t -= 1;
      // New dawn
      this.registry.set('daysSurvived', (this.registry.get('daysSurvived') || 0) + 1);
      // Fire goes out at dawn — must be re-fed at next dusk
      this.registry.set('campfireLit', false);
      this.campfire.setLit(false);
      this.warmHalo.fillAlpha = 0;
      // Despawn surviving wolves at dawn
      for (const w of this.wolves) w.visual.destroy();
      this.wolves = [];
      this.wolfSpawnCooldown = 0;
    }
    this.registry.set('timeOfDay', t);

    // night = anything past daylightFraction
    const isNight = t > TIME.daylightFraction;
    this.registry.set('isNight', isNight);

    // Night overlay alpha — eased through dusk window
    let alpha;
    if (t < TIME.daylightFraction - DUSK_FRACTION) {
      alpha = 0;
    } else if (t < TIME.daylightFraction) {
      const k = (t - (TIME.daylightFraction - DUSK_FRACTION)) / DUSK_FRACTION;
      alpha = k * 0.55;
    } else if (t > 1 - DUSK_FRACTION) {
      const k = (1 - t) / DUSK_FRACTION;
      alpha = k * 0.7;
    } else {
      alpha = 0.7;
    }
    this.nightOverlay.fillAlpha = alpha;

    // Track night-edge for wolf spawn timing reset + boss counters.
    if (isNight && !this.lastNightFlag) {
      this.wolfSpawnCooldown = WOLF_NIGHT_INITIAL_DELAY_SEC;
      this.wolvesSpawnedThisNight = 0;
      this.bossesSpawnedThisNight = 0;
    }
    this.lastNightFlag = isNight;
  }

  tickRegrowth(time) {
    for (const r of [...this.bushes, ...this.trees, ...this.rocks, ...this.sticks, ...this.mushrooms, ...this.ponds]) {
      if (r.depleted && time >= r.respawnAt) {
        r.depleted = false;
        if (r.kind === 'tree') {
          r.hp = TREE_HP;
          r.stumpVisual.setVisible(false);
          r.visual.setVisible(true);
        } else if (r.kind === 'pond') {
          // Pond stays visible always — restock means showing the fish layer.
          r.visual.fishLayer.setVisible(true);
        } else {
          r.visual.setVisible(true);
        }
      }
    }
  }

  tickCampfireFlicker(time) {
    if (this.registry.get('campfireBuilt')) {
      this.campfire.container.setVisible(true);
    }
    const lit = this.registry.get('campfireLit');
    this.campfire.setLit(lit);
    this.warmHalo.fillAlpha = lit ? 0.22 : 0;
    if (lit) this.campfire.flicker(time);
  }

  // Tiny embers drift up off a lit campfire — one every ~140ms.
  tickCampfireEmbers(time) {
    if (!this.registry.get('campfireLit')) return;
    if (time - (this._lastEmberAt || 0) < 140) return;
    this._lastEmberAt = time;
    const ex = WORLD.campfire.x + (Math.random() - 0.5) * 14;
    const ey = WORLD.campfire.y - 8;
    this.burstParticles(ex, ey, { colors: [0xff7a1a, 0xffd24a], count: 1, size: 3, speed: 18, life: 900, drift: -70 });
  }

  // Boots kick up small dust puffs while sprinting and moving.
  tickSprintDust(time) {
    if (!this._sprinting) return;
    if (time - (this._lastDustAt || 0) < 90) return;
    this._lastDustAt = time;
    this.burstParticles(this.player.x, this.player.y + 10, { colors: [0xc4a47a, 0x6b3a1f], count: 2, size: 3, speed: 30, life: 360, drift: -4 });
  }

  tickTentHeal(dt) {
    const dx = this.player.x - WORLD.tent.x;
    const dy = this.player.y - WORLD.tent.y;
    if (Math.hypot(dx, dy) <= WORLD.tent.healRadius) {
      adjustHealth(this.registry, RATES.tentHeal * dt);
    }
  }

  // --- Wolves --------------------------------------------------------------

  tickWolves(dt) {
    const isNight = this.registry.get('isNight');
    const maxAlive = this.currentWolfMaxAlive();
    const spawnGap = this.currentWolfSpawnGap();
    const wolfSpeed = this.currentWolfSpeed();

    if (isNight && this.wolves.length < maxAlive) {
      this.wolfSpawnCooldown -= dt;
      if (this.wolfSpawnCooldown <= 0) {
        if (this.shouldSpawnBoss()) {
          this.spawnBoss();
          this.bossesSpawnedThisNight += 1;
        } else {
          this.spawnWolf();
          this.wolvesSpawnedThisNight += 1;
        }
        this.wolfSpawnCooldown = spawnGap;
      }
    }

    // Move + bite
    for (const w of this.wolves) {
      if (w.dead) continue;
      const stats = w.isBoss ? BOSS : WOLF;
      const speedNow = w.isBoss ? BOSS.speed : wolfSpeed;
      const dx = this.player.x - w.visual.x;
      const dy = this.player.y - w.visual.y;
      const d = Math.hypot(dx, dy) || 1;
      const stepX = (dx / d) * speedNow * dt;
      const stepY = (dy / d) * speedNow * dt;
      // Axis-separated collision against placed room walls — gives sliding.
      const tryX = w.visual.x + stepX;
      const tryY = w.visual.y + stepY;
      if (!this.posBlockedByRoom(tryX, w.visual.y)) w.visual.x = tryX;
      if (!this.posBlockedByRoom(w.visual.x, tryY)) w.visual.y = tryY;
      w.visual.scaleX = dx < 0 ? -1 : 1;

      // Bite — once per cooldown. Priority: bite player if reachable & not in
      // a room; else gnaw the nearest room wall; else (player in room with no
      // wall in range) toast safe.
      const now = this.time.now;
      if (now - (w.lastBiteAt || 0) >= stats.contactCooldownMs) {
        let didSomething = false;
        const playerReach = d <= stats.radius + 12;
        if (playerReach && !this.playerInRoom()) {
          adjustHealth(this.registry, -stats.contactDamage);
          this.flashPlayer();
          const partCount = w.isBoss ? 36 : 22;
          this.burstParticles(this.player.x, this.player.y, { colors: [0xd13a3a, 0x6a1818], count: partCount, size: 4, speed: 160, life: 520 });
          didSomething = true;
        } else {
          const room = this.nearestBiteableRoom(w);
          if (room) {
            this.damageRoom(room, w);
            didSomething = true;
          } else if (playerReach && this.playerInRoom()) {
            this.burstParticles(this.player.x, this.player.y, { colors: [0xc4a47a, 0xf4e4bc], count: 12, size: 3, speed: 70, life: 360, drift: -10 });
            this.hud.flashToast('safe inside walls');
            didSomething = true;
          }
        }
        if (didSomething) w.lastBiteAt = now;
      }
    }
    // Drop dead wolves
    this.wolves = this.wolves.filter(w => {
      if (w.dead) { w.visual.destroy(); return false; }
      return true;
    });
  }

  // --- Wolf scaling per night --------------------------------------------

  currentWolfMaxAlive() {
    const days = this.registry.get('daysSurvived') || 0;
    return Math.floor(WOLF_MAX_ALIVE * Math.pow(WOLF_SCALE.maxAliveMult, days));
  }

  shouldSpawnBoss() {
    const days = this.registry.get('daysSurvived') || 0;
    const nightNumber = days + 1;
    if (nightNumber < WOLF_SCALE.bossUnlockNight) return false;
    if (this.wolvesSpawnedThisNight < WOLF_SCALE.bossUnlockSpawns) return false;
    const quota = nightNumber - WOLF_SCALE.bossUnlockNight + 1;
    return this.bossesSpawnedThisNight < quota;
  }

  currentWolfSpawnGap() {
    const days = this.registry.get('daysSurvived') || 0;
    const gap = WOLF_SPAWN_GAP_SEC / Math.pow(WOLF_SCALE.spawnGapDivisor, days);
    return Math.max(WOLF_SCALE.spawnGapFloor, gap);
  }

  currentWolfSpeed() {
    const days = this.registry.get('daysSurvived') || 0;
    return Math.min(WOLF_SCALE.speedCap, WOLF.speed + days * WOLF_SCALE.speedBonus);
  }

  // --- Wolf vs room geometry ---------------------------------------------

  // True if the (expanded) AABB of any placed room contains (x, y).
  // Padded by wolf radius so the wolf snout can't poke into the floor.
  posBlockedByRoom(x, y) {
    const s = BUILDING.cellSize;
    const r = WOLF.radius + 2;
    for (const room of this.rooms.values()) {
      const minX = room.cell.gx * s - r;
      const minY = room.cell.gy * s - r;
      const maxX = (room.cell.gx + 1) * s + r;
      const maxY = (room.cell.gy + 1) * s + r;
      if (x > minX && x < maxX && y > minY && y < maxY) return true;
    }
    return false;
  }

  // Closest room within bite reach of this wolf, or null.
  nearestBiteableRoom(wolf) {
    const wx = wolf.visual.x, wy = wolf.visual.y;
    const s = BUILDING.cellSize;
    const reach = WOLF.radius + 6;
    let best = null, bestD = Infinity;
    for (const room of this.rooms.values()) {
      const rx = room.cell.gx * s, ry = room.cell.gy * s;
      const cx = Math.max(rx, Math.min(wx, rx + s));
      const cy = Math.max(ry, Math.min(wy, ry + s));
      const dist = Math.hypot(wx - cx, wy - cy);
      if (dist <= reach && dist < bestD) { best = room; bestD = dist; }
    }
    return best;
  }

  damageRoom(room, wolf) {
    const dmg = wolf.isBoss ? BOSS.roomDamage : 1;
    room.hp = (room.hp ?? BUILDING.roomHp) - dmg;
    // Quick scale pulse for hit feedback.
    this.tweens.add({ targets: room.visual, scale: wolf.isBoss ? 0.88 : 0.94, duration: 70, yoyo: true });
    this.burstParticles(wolf.visual.x, wolf.visual.y, {
      colors: [0x6b3a1f, 0x8a5b3a, 0xf4e4bc], count: wolf.isBoss ? 16 : 8, size: 3, speed: wolf.isBoss ? 170 : 130, life: 420
    });
    const label = room.isDiamond ? 'diamond ' : room.isMetal ? 'metal ' : '';
    this.hud.flashToast(`${label}room ${Math.max(0, room.hp)}/${room.maxHp ?? BUILDING.roomHp}`);
    if (room.hp <= 0) this.destroyRoom(room);
  }

  destroyRoom(room) {
    const x = room.visual.x;
    const y = room.visual.y;
    room.visual.destroy();
    this.rooms.delete(this.cellKey(room.cell));
    this.burstParticles(x, y, {
      colors: [0x6b3a1f, 0x8a5b3a, 0xf4e4bc, 0x4a2a14],
      count: 30, size: 4, speed: 200, life: 700
    });
    this.cameras.main.shake(140, 0.005);
    this.hud.flashToast('a room was broken!');
  }

  spawnWolf() {
    const angle = Math.random() * Math.PI * 2;
    const r = WOLF.spawnDistFromPlayer;
    let x = this.player.x + Math.cos(angle) * r;
    let y = this.player.y + Math.sin(angle) * r;
    // Clamp inside world bounds
    x = Math.max(40, Math.min(WORLD.width - 40, x));
    y = Math.max(40, Math.min(WORLD.height - 40, y));
    const visual = drawWolf(this, x, y);
    this.wolves.push({ visual, hp: WOLF.hp, dead: false, lastBiteAt: 0 });
  }

  spawnBoss() {
    const angle = Math.random() * Math.PI * 2;
    const r = BOSS.spawnDistFromPlayer;
    let x = this.player.x + Math.cos(angle) * r;
    let y = this.player.y + Math.sin(angle) * r;
    x = Math.max(40, Math.min(WORLD.width - 40, x));
    y = Math.max(40, Math.min(WORLD.height - 40, y));
    const visual = drawBoss(this, x, y);
    this.wolves.push({ visual, hp: BOSS.hp, dead: false, lastBiteAt: 0, isBoss: true });
    this.hud.flashToast('a boss appears!');
    this.cameras.main.flash(220, 140, 30, 30);
  }

  flashPlayer() {
    this.cameras.main.flash(120, 220, 60, 60);
  }

  // --- Targeting + interact ------------------------------------------------

  // Maps the current build type → material/cost/hp/visual/ghost-color.
  roomSpec(type = this.currentRoomType) {
    if (type === 'metal') {
      return {
        type, matKey: 'iron', matCost: BUILDING.ironPerMetalRoom, maxHp: BUILDING.metalRoomHp,
        draw: drawMetalRoom, ghostColor: 0x6ad8e8,
        burstColors: [0x5a6a7a, 0x9aaab8, 0xc4d4e4],
        label: 'metal '
      };
    }
    if (type === 'diamond') {
      return {
        type, matKey: 'diamond', matCost: BUILDING.diamondPerDiamondRoom, maxHp: BUILDING.diamondRoomHp,
        draw: drawDiamondRoom, ghostColor: 0xffffff,
        burstColors: [0x9ce6ee, 0xffffff, 0x6ad8e8, 0x4aa8d8],
        label: 'diamond '
      };
    }
    return {
      type: 'wood', matKey: 'wood', matCost: BUILDING.woodPerRoom, maxHp: BUILDING.roomHp,
      draw: drawRoom, ghostColor: 0x55ff77,
      burstColors: [0x6b3a1f, 0x8a5b3a, 0xf4e4bc],
      label: ''
    };
  }

  refreshTarget() {
    if (this.buildingMode) {
      this.target = null;
      this.targetRing.setVisible(false);
      const spec = this.roomSpec();
      const have = getItem(this.registry, spec.matKey);
      const cell = this.cellAtPlayer();
      const occupied = this.rooms.has(this.cellKey(cell));
      const reason = occupied
        ? '— cell taken'
        : have < spec.matCost
          ? `— need ${spec.matCost} ${spec.matKey} (have ${have})`
          : '';
      this.hud.setPrompt(`BUILDING [${this.currentRoomType.toUpperCase()}] — SPACE place (${spec.matCost} ${spec.matKey}) · TAB switch · F/ESC exit ${reason}`);
      return;
    }
    const px = this.player.x, py = this.player.y;
    let best = null;
    let bestDist = INTERACT_RADIUS;

    // tent (always available — workbench)
    const tentD = Math.hypot(px - WORLD.tent.x, py - WORLD.tent.y);
    if (tentD <= WORLD.tent.healRadius) {
      best = { kind: 'tent', x: WORLD.tent.x, y: WORLD.tent.y - 30 };
      bestDist = -1; // tent always wins when overlapping its zone
    }

    // campfire — only useful if built
    if (this.registry.get('campfireBuilt')) {
      const d = Math.hypot(px - WORLD.campfire.x, py - WORLD.campfire.y);
      if (d <= INTERACT_RADIUS && d < bestDist) {
        best = { kind: 'campfire', x: WORLD.campfire.x, y: WORLD.campfire.y - 28 };
        bestDist = d;
      }
    }

    // wolves — top priority within INTERACT_RADIUS if spear equipped
    const equipped = this.registry.get('equipped');
    if (equipped === 'spear') {
      for (const w of this.wolves) {
        if (w.dead) continue;
        const d = Math.hypot(px - w.visual.x, py - w.visual.y);
        if (d <= INTERACT_RADIUS && d < bestDist) {
          best = { kind: 'wolf', x: w.visual.x, y: w.visual.y - 16, ref: w };
          bestDist = d;
        }
      }
    }

    // resources
    for (const r of [...this.bushes, ...this.trees, ...this.rocks, ...this.sticks, ...this.mushrooms, ...this.ponds]) {
      if (r.depleted) continue;
      const d = Math.hypot(px - r.x, py - r.y);
      // Ponds are big — let the player fish from the bank, not just the center.
      const range = r.kind === 'pond' ? 110 : INTERACT_RADIUS;
      if (d <= range && d < bestDist) {
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

    // HUD prompt
    this.hud.setPrompt(this.promptFor(best));
  }

  promptFor(target) {
    const equipped = this.registry.get('equipped');
    if (!target) return 'WASD move · Shift sprint · Q eat · Z inventory';
    switch (target.kind) {
      case 'tent': return 'E open workbench · resting heals';
      case 'campfire': {
        const built = this.registry.get('campfireBuilt');
        const lit = this.registry.get('campfireLit');
        if (!built) return 'Build the campfire at the workbench first';
        if (lit) return 'Fire is lit — burns through the night';
        if (this.registry.get('isNight')) return 'E feed fire (1 wood)';
        return 'E feed fire at dusk (1 wood)';
      }
      case 'bush': return 'E pick berry';
      case 'stick': return 'E pick up stick (+1 wood)';
      case 'mushroom': return 'E pick mushroom (risky to eat)';
      case 'pond': return target.ref?.depleted ? 'fish are scattered — wait for them to return' : 'E fish (+1 fish)';
      case 'tree': return equipped === 'axe' ? 'E chop tree' : 'Need an axe (craft at tent)';
      case 'rock': return target.ref?.isIron ? 'E mine iron ore' : 'E mine stone';
      case 'wolf': return 'E spear';
      default: return '';
    }
  }

  handleInteract() {
    const t = this.target;
    if (!t) return;
    switch (t.kind) {
      case 'tent':
        this.scene.pause();
        this.scene.launch('CraftScene');
        return;
      case 'campfire':
        this.feedCampfire();
        return;
      case 'bush':
        this.pickBush(t.ref);
        return;
      case 'stick':
        this.pickStick(t.ref);
        return;
      case 'mushroom':
        this.pickMushroom(t.ref);
        return;
      case 'pond':
        this.fishPond(t.ref);
        return;
      case 'tree':
        this.chopTree(t.ref);
        return;
      case 'rock':
        this.mineRock(t.ref);
        return;
      case 'wolf':
        this.spearWolf(t.ref);
        return;
    }
  }

  handleEat() {
    if (getItem(this.registry, 'trailMix') > 0) return this.eatItem('trailMix');
    if (getItem(this.registry, 'berries') > 0) return this.eatItem('berries');
    this.hud.flashToast('nothing to eat');
  }

  // Hotbar slot 1/2 — toggle equip on the named tool.
  activateSlot(tool) {
    if (!ownsTool(this.registry, tool)) {
      this.hud.flashToast(`no ${tool} yet`);
      return;
    }
    const equipped = this.registry.get('equipped');
    equipTool(this.registry, equipped === tool ? null : tool);
  }

  // Hotbar slot 3/4/6 — eat one of the named food.
  eatItem(itemKey) {
    if (getItem(this.registry, itemKey) <= 0) {
      this.hud.flashToast('none in inventory');
      return;
    }
    removeItem(this.registry, itemKey, 1);
    const restore = itemKey === 'trailMix' ? FOOD.trailMix
      : itemKey === 'fish' ? FOOD.fish
      : FOOD.berry;
    adjustHunger(this.registry, restore);
    const label = itemKey === 'trailMix' ? '+ate trail mix'
      : itemKey === 'fish' ? '+ate fish'
      : '+ate berry';
    const colors = itemKey === 'trailMix' ? [0xc4a47a, 0xd1373a, 0x6b3a1f]
      : itemKey === 'fish' ? [0x4aa8d8, 0xc4e4f8]
      : [0xd1373a, 0x6a1818];
    this.burstParticles(this.player.x, this.player.y - 12, { colors, count: 16, size: 3, speed: 80, life: 420, drift: -26 });
    this.hud.flashToast(label);
  }

  // Hotbar slot 5 — gamble. Roll on each bite, not at pick time, so every
  // mushroom in your bag is its own coin flip.
  eatMushroom() {
    if (getItem(this.registry, 'mushroom') <= 0) {
      this.hud.flashToast('no mushrooms');
      return;
    }
    removeItem(this.registry, 'mushroom', 1);
    if (Math.random() < MUSHROOM.poisonChance) {
      adjustHealth(this.registry, -MUSHROOM.poisonDamage);
      this.cameras.main.flash(180, 120, 30, 180);
      this.burstParticles(this.player.x, this.player.y - 6, { colors: [0x9a4ad8, 0x6a3aa8, 0x3c8233], count: 26, size: 4, speed: 120, life: 650, drift: -34 });
      this.hud.flashToast(`POISONOUS! -${MUSHROOM.poisonDamage} hp`);
    } else {
      adjustHunger(this.registry, 100); // clamps to max → fully fills
      this.burstParticles(this.player.x, this.player.y - 12, { colors: [0xffd24a, 0xfff4e4, 0xc4a47a], count: 22, size: 4, speed: 110, life: 560, drift: -32 });
      this.hud.flashToast('delicious! hunger full');
    }
  }

  // --- Resource actions ----------------------------------------------------

  pickBush(b) {
    if (b.depleted) return;
    if (!hasStamina(this.registry, COSTS.pickBerry)) {
      this.hud.flashToast('too tired');
      return;
    }
    adjustStamina(this.registry, -COSTS.pickBerry);
    addItem(this.registry, 'berries', 1);
    b.depleted = true;
    b.respawnAt = this.time.now + REGROW_MS.bush;
    b.visual.setVisible(false);
    this.burstParticles(b.x, b.y, { colors: [0xd1373a, 0x6a1818, 0x2e5e2a], count: 18, size: 4 });
    this.hud.flashToast('+1 berry');
  }

  pickStick(s) {
    if (s.depleted) return;
    if (!hasStamina(this.registry, COSTS.pickStick)) {
      this.hud.flashToast('too tired');
      return;
    }
    adjustStamina(this.registry, -COSTS.pickStick);
    addItem(this.registry, 'wood', 1);
    s.depleted = true;
    s.respawnAt = this.time.now + REGROW_MS.stick;
    s.visual.setVisible(false);
    this.burstParticles(s.x, s.y, { colors: [0x6b3a1f, 0x8a5b3a], count: 16, size: 3 });
    this.hud.flashToast('+1 wood (stick)');
  }

  pickMushroom(m) {
    if (m.depleted) return;
    if (!hasStamina(this.registry, COSTS.pickMushroom)) {
      this.hud.flashToast('too tired');
      return;
    }
    adjustStamina(this.registry, -COSTS.pickMushroom);
    addItem(this.registry, 'mushroom', 1);
    m.depleted = true;
    m.respawnAt = this.time.now + REGROW_MS.mushroom;
    m.visual.setVisible(false);
    this.burstParticles(m.x, m.y, { colors: [0xc4373a, 0xfff4e4, 0xf4e4bc], count: 18, size: 3 });
    this.hud.flashToast('+1 mushroom');
  }

  fishPond(p) {
    if (p.depleted) {
      this.hud.flashToast('no fish biting');
      return;
    }
    if (!hasStamina(this.registry, COSTS.fish)) {
      this.hud.flashToast('too tired');
      return;
    }
    adjustStamina(this.registry, -COSTS.fish);
    addItem(this.registry, 'fish', 1);
    p.depleted = true;
    p.respawnAt = this.time.now + REGROW_MS.pondFish;
    // Hide just the fish silhouettes — the pond itself stays.
    p.visual.fishLayer.setVisible(false);
    // Splash on the bank near the player so it reads as the catch, not the pond center.
    this.burstParticles(this.player.x, this.player.y, { colors: [0x4aa8d8, 0xc4e4f8, 0x2f6ba8], count: 26, size: 4, speed: 110 });
    this.hud.flashToast('+1 fish');
  }

  chopTree(t) {
    if (t.depleted) return;
    if (this.registry.get('equipped') !== 'axe') {
      this.hud.flashToast('need axe equipped (1)');
      return;
    }
    if (!hasStamina(this.registry, COSTS.chopTree)) {
      this.hud.flashToast('too tired');
      return;
    }
    adjustStamina(this.registry, -COSTS.chopTree);
    t.hp -= 1;
    this.cameras.main.shake(80, 0.002);
    // Wood chips fly each chop; bigger burst when the tree falls.
    if (t.hp <= 0) {
      addItem(this.registry, 'wood', 2);
      t.depleted = true;
      t.respawnAt = this.time.now + REGROW_MS.tree;
      t.visual.setVisible(false);
      t.stumpVisual.setVisible(true);
      this.burstParticles(t.x, t.y - 18, { colors: [0x6b3a1f, 0x8a5b3a, 0x3c8233], count: 38, size: 4, speed: 180, life: 750 });
      this.hud.flashToast('+2 wood');
    } else {
      addItem(this.registry, 'wood', 1);
      this.burstParticles(t.x, t.y, { colors: [0x6b3a1f, 0x8a5b3a], count: 16, size: 3 });
      this.hud.flashToast('+1 wood');
    }
  }

  mineRock(r) {
    if (r.depleted) return;
    if (!hasStamina(this.registry, COSTS.mineRock)) {
      this.hud.flashToast('too tired');
      return;
    }
    adjustStamina(this.registry, -COSTS.mineRock);
    if (r.isIron) {
      addItem(this.registry, 'iron', 1);
      this.burstParticles(r.x, r.y, { colors: [0x5a6a7a, 0x9aaab8, 0xc4d4e4, 0xe4ecf4], count: 24, size: 4, speed: 150 });
      this.hud.flashToast('+1 iron');
    } else {
      addItem(this.registry, 'stone', 1);
      this.burstParticles(r.x, r.y, { colors: [0x6e6e74, 0x9a9aa2, 0x2e2e34], count: 22, size: 4, speed: 150 });
      this.hud.flashToast('+1 stone');
    }
    r.depleted = true;
    r.respawnAt = this.time.now + REGROW_MS.rock;
    r.visual.setVisible(false);
  }

  spearWolf(w) {
    if (w.dead) return;
    if (!hasStamina(this.registry, COSTS.spearThrust)) {
      this.hud.flashToast('too tired');
      return;
    }
    adjustStamina(this.registry, -COSTS.spearThrust);
    w.hp -= 1;
    // Knock back — bosses are heavier.
    const dx = w.visual.x - this.player.x;
    const dy = w.visual.y - this.player.y;
    const d = Math.hypot(dx, dy) || 1;
    const knock = w.isBoss ? 12 : 30;
    w.visual.x += (dx / d) * knock;
    w.visual.y += (dy / d) * knock;
    if (w.hp <= 0) {
      w.dead = true;
      const partCount = w.isBoss ? 80 : 40;
      this.burstParticles(w.visual.x, w.visual.y, { colors: [0xd13a3a, 0x6a1818, 0x4a4a52, 0x14141a], count: partCount, size: 4, speed: 200, life: 800 });
      if (w.isBoss) this.cameras.main.shake(160, 0.006);
      this.hud.flashToast(w.isBoss ? 'boss down!' : 'wolf down!');
    } else {
      this.burstParticles(w.visual.x, w.visual.y, { colors: [0xd13a3a, 0x6a1818], count: 18, size: 3, speed: 150, life: 480 });
      if (w.isBoss) this.hud.flashToast(`boss ${w.hp}/${BOSS.hp}`);
    }
  }

  feedCampfire() {
    if (!this.registry.get('campfireBuilt')) return;
    if (this.registry.get('campfireLit')) {
      this.hud.flashToast('fire already lit');
      return;
    }
    if (getItem(this.registry, 'wood') < 1) {
      this.hud.flashToast('need 1 wood');
      return;
    }
    removeItem(this.registry, 'wood', 1);
    this.registry.set('campfireLit', true);
    this.burstParticles(WORLD.campfire.x, WORLD.campfire.y - 6, { colors: [0xff7a1a, 0xffd24a, 0xfff4e4], count: 32, size: 4, speed: 150, life: 650, drift: -44 });
    this.hud.flashToast('fire lit');
  }

  // --- Particle bursts ----------------------------------------------------

  // Throw a fistful of small circles in a rough circle at (x, y), then tween
  // them outward + fading + shrinking. Cheap, stateless, no asset needed.
  // Global multiplier so we can scale every burst up/down from one knob.
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

  // --- Building mode ------------------------------------------------------

  toggleBuildingMode() {
    this.buildingMode = !this.buildingMode;
    this.ghostRoom.setVisible(this.buildingMode);
    if (!this.buildingMode) {
      this.hud.flashToast('build mode off');
    } else {
      this.hud.flashToast('build mode on — SPACE to place');
    }
  }

  cellAtPlayer() {
    const s = BUILDING.cellSize;
    return {
      gx: Math.floor(this.player.x / s),
      gy: Math.floor(this.player.y / s)
    };
  }

  cellKey({ gx, gy }) { return `${gx},${gy}`; }

  playerInRoom() {
    return this.rooms.has(this.cellKey(this.cellAtPlayer()));
  }

  cellCenter({ gx, gy }) {
    const s = BUILDING.cellSize;
    return { x: gx * s + s / 2, y: gy * s + s / 2 };
  }

  tickBuildingGhost() {
    if (!this.buildingMode) return;
    const cell = this.cellAtPlayer();
    const { x, y } = this.cellCenter(cell);
    this.ghostRoom.x = x;
    this.ghostRoom.y = y;
    const spec = this.roomSpec();
    const occupied = this.rooms.has(this.cellKey(cell));
    const canAfford = getItem(this.registry, spec.matKey) >= spec.matCost;
    const ok = !occupied && canAfford;
    const color = ok ? spec.ghostColor : 0xff5555;
    this.ghostRoom.setFillStyle(color, 0.25);
    this.ghostRoom.setStrokeStyle(3, color, 0.9);
  }

  tryPlaceRoom() {
    const cell = this.cellAtPlayer();
    const key = this.cellKey(cell);
    if (this.rooms.has(key)) {
      this.hud.flashToast('already a room here');
      return;
    }
    const spec = this.roomSpec();
    if (!removeItem(this.registry, spec.matKey, spec.matCost)) {
      this.hud.flashToast(`need ${spec.matCost} ${spec.matKey}`);
      return;
    }
    const { x, y } = this.cellCenter(cell);
    const visual = spec.draw(this, x, y, BUILDING.cellSize);
    this.rooms.set(key, {
      cell, visual,
      hp: spec.maxHp, maxHp: spec.maxHp,
      type: spec.type,
      isMetal: spec.type === 'metal',
      isDiamond: spec.type === 'diamond'
    });
    this.burstParticles(x, y, { colors: spec.burstColors, count: 32, size: 4, speed: 150, life: 650 });
    this.hud.flashToast(`${spec.label}room built (-${spec.matCost} ${spec.matKey})`);
  }

  // --- Time skip ----------------------------------------------------------

  // Called by the HUD's skip-day button. Jumps timeOfDay just past dusk so
  // the night-edge logic in tickTime fires on the next frame and wolves
  // start spawning.
  skipDaytime() {
    if (this.registry.get('isNight')) return;
    this.registry.set('timeOfDay', TIME.daylightFraction + 0.001);
    this.hud.flashToast('night falls...');
  }

  // --- Death / restart ----------------------------------------------------

  die() {
    if (this.registry.get('gameOver')) return;
    this.registry.set('gameOver', true);
    const days = this.registry.get('daysSurvived') || 0;
    this.scene.stop('HUDScene');
    this.scene.start('GameOverScene', { days });
  }
}
