// Pure-graphics draw helpers for the forest world. Each helper returns the
// container/graphic so ForestScene can hide/show or recolor it later.

import Phaser from 'phaser';

// --- Ground ---------------------------------------------------------------

// Tiled mossy floor with darker patches. Drawn once, fits the scene bounds.
export function drawGround(scene, width, height, seed) {
  const g = scene.add.graphics();
  g.fillStyle(0x2c4a26, 1).fillRect(0, 0, width, height);
  // dirt patches
  const rng = mulberry32(seed ^ 0x9e3779b9);
  for (let i = 0; i < 90; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const r = 30 + rng() * 70;
    g.fillStyle(0x35562c, 0.55);
    g.fillCircle(x, y, r);
  }
  // tiny grass tufts
  for (let i = 0; i < 600; i++) {
    const x = rng() * width;
    const y = rng() * height;
    g.fillStyle(0x4a7a3a, 0.55);
    g.fillRect(x, y, 2, 4);
  }
  g.setDepth(0);
  return g;
}

// --- Tent (workbench + heal zone) ----------------------------------------

export function drawTent(scene, x, y) {
  const c = scene.add.container(x, y);
  // shadow
  const shadow = scene.add.ellipse(0, 30, 110, 22, 0x000000, 0.35);
  // canvas body — triangle
  const body = scene.add.graphics();
  body.fillStyle(0xc4734a, 1);
  body.beginPath();
  body.moveTo(-60, 30);
  body.lineTo(0, -55);
  body.lineTo(60, 30);
  body.closePath();
  body.fillPath();
  body.lineStyle(3, 0x6b3a1f, 1);
  body.strokePath();
  // door
  const door = scene.add.graphics();
  door.fillStyle(0x2a160a, 1);
  door.beginPath();
  door.moveTo(0, 30);
  door.lineTo(-15, -10);
  door.lineTo(15, -10);
  door.closePath();
  door.fillPath();
  // ridge pole
  const pole = scene.add.graphics();
  pole.lineStyle(3, 0x4a2a14, 1);
  pole.strokeLineShape(new Phaser.Geom.Line(0, -60, 0, 35));
  c.add([shadow, body, pole, door]);
  c.setDepth(2);
  return c;
}

// --- Tree -----------------------------------------------------------------

export function drawTree(scene, x, y) {
  const c = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 28, 60, 14, 0x000000, 0.3);
  const trunk = scene.add.rectangle(0, 14, 14, 32, 0x5a3a1f);
  trunk.setStrokeStyle(2, 0x2f1d0d);
  const c1 = scene.add.circle(-18, -10, 22, 0x2f6b29);
  const c2 = scene.add.circle(16, -8, 24, 0x2f6b29);
  const c3 = scene.add.circle(0, -28, 26, 0x3c8233);
  c1.setStrokeStyle(2, 0x143816);
  c2.setStrokeStyle(2, 0x143816);
  c3.setStrokeStyle(2, 0x143816);
  c.add([shadow, trunk, c1, c2, c3]);
  c.setDepth(3);
  return c;
}

// Stump shown when tree is felled and respawning.
export function drawStump(scene, x, y) {
  const c = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 14, 38, 10, 0x000000, 0.3);
  const stump = scene.add.circle(0, 8, 12, 0x6b4628);
  stump.setStrokeStyle(2, 0x2f1d0d);
  const ring = scene.add.circle(0, 8, 6, 0x8a5b3a);
  c.add([shadow, stump, ring]);
  c.setDepth(2);
  c.setVisible(false);
  return c;
}

// --- Bush ------------------------------------------------------------------

export function drawBush(scene, x, y) {
  const c = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 14, 50, 12, 0x000000, 0.3);
  const body = scene.add.circle(0, 0, 22, 0x2e5e2a);
  body.setStrokeStyle(2, 0x143816);
  const b1 = scene.add.circle(-10, -6, 4, 0xd1373a);
  const b2 = scene.add.circle(8, -2, 4, 0xd1373a);
  const b3 = scene.add.circle(0, 8, 4, 0xd1373a);
  c.add([shadow, body, b1, b2, b3]);
  c.berries = [b1, b2, b3];
  c.setDepth(3);
  return c;
}

// --- Rock ------------------------------------------------------------------

export function drawRock(scene, x, y) {
  const c = scene.add.container(x, y);
  // Shadow sits a hair below the spawn point — that's the "ground line".
  const shadow = scene.add.ellipse(0, 6, 46, 11, 0x000000, 0.4);
  // Rock geometry shifted up so its base rests ON the shadow rather than
  // straddling the spawn point (which made it look floating).
  const main = scene.add.polygon(0, -10,
    [-18, 8, -10, -10, 8, -14, 18, -2, 14, 12, -4, 14], 0x6e6e74);
  main.setStrokeStyle(2, 0x2e2e34);
  const hi = scene.add.polygon(0, -12, [-8, -6, 4, -10, 6, -2, -2, 0], 0x9a9aa2);
  c.add([shadow, main, hi]);
  c.setDepth(3);
  return c;
}

// --- Pond -----------------------------------------------------------------

// A pond. Returns the container plus a `fishLayer` that the scene can hide
// while the pond is depleted (fishless) and show again on respawn.
export function drawPond(scene, x, y) {
  const c = scene.add.container(x, y);
  // Outer dirt rim
  const rim = scene.add.ellipse(0, 4, 168, 116, 0x3d2a18);
  rim.setStrokeStyle(3, 0x1f1408);
  // Deep water
  const deep = scene.add.ellipse(0, 0, 156, 104, 0x1a4a8a);
  // Mid water
  const mid = scene.add.ellipse(0, -4, 132, 84, 0x2f6ba8);
  // Light highlight
  const hi = scene.add.ellipse(-18, -10, 64, 26, 0x6aa8d8, 0.7);
  // Surface ripples — small white-ish arcs
  const r1 = scene.add.ellipse(20, 8, 28, 4, 0xc4e4f8, 0.7);
  const r2 = scene.add.ellipse(-30, 14, 18, 3, 0xc4e4f8, 0.6);
  c.add([rim, deep, mid, hi, r1, r2]);

  // Fish silhouettes on top — these are the "stock" indicator. Hide when
  // depleted (fish caught), show again after respawn.
  const fishLayer = scene.add.container(0, 0);
  const f1 = scene.add.ellipse(-10, -2, 14, 6, 0x081828, 0.85);
  const f1tail = scene.add.triangle(-18, -2, 0, 0, 6, -3, 6, 3, 0x081828, 0.85);
  const f2 = scene.add.ellipse(28, 6, 12, 5, 0x081828, 0.8);
  const f2tail = scene.add.triangle(34, 6, 0, 0, -6, -3, -6, 3, 0x081828, 0.8);
  fishLayer.add([f1, f1tail, f2, f2tail]);
  c.add(fishLayer);

  c.setDepth(1);
  // Expose helper handles on the container so the scene can flip stock on/off.
  c.fishLayer = fishLayer;
  return c;
}

// --- Mushroom -------------------------------------------------------------

// Classic toadstool — players can't tell good from poisonous from looks alone
// (intentional — poison chance is rolled per-bite at eat time).
export function drawMushroom(scene, x, y) {
  const c = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 6, 22, 6, 0x000000, 0.3);
  const stem = scene.add.rectangle(0, 0, 6, 12, 0xf4e4bc).setStrokeStyle(1, 0x6a4a2a);
  const cap = scene.add.ellipse(0, -8, 22, 14, 0xc4373a).setStrokeStyle(1, 0x6a1818);
  const dot1 = scene.add.circle(-5, -10, 1.8, 0xfff4e4);
  const dot2 = scene.add.circle(4, -7, 1.8, 0xfff4e4);
  const dot3 = scene.add.circle(0, -12, 1.6, 0xfff4e4);
  c.add([shadow, stem, cap, dot1, dot2, dot3]);
  c.setDepth(2);
  return c;
}

// --- Stick (loose wood on the ground) ------------------------------------

export function drawStick(scene, x, y) {
  const c = scene.add.container(x, y);
  // Two crossed twigs lying flat — small footprint so they read as ground litter.
  const shadow = scene.add.ellipse(0, 6, 28, 6, 0x000000, 0.25);
  const a = scene.add.rectangle(0, 0, 26, 4, 0x6b3a1f).setRotation(0.4);
  const b = scene.add.rectangle(2, 2, 20, 3, 0x8a5b3a).setRotation(-0.7);
  a.setStrokeStyle(1, 0x2f1d0d);
  b.setStrokeStyle(1, 0x2f1d0d);
  c.add([shadow, a, b]);
  c.setDepth(1); // below trees/bushes — they're on the ground
  return c;
}

// --- Iron rock ------------------------------------------------------------

// Same chunky polygon as a regular rock, but bluer steel tint with bright
// flecks of ore. Same geometry so the mine-collision check is identical.
export function drawIronRock(scene, x, y) {
  const c = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 6, 46, 11, 0x000000, 0.4);
  const main = scene.add.polygon(0, -10,
    [-18, 8, -10, -10, 8, -14, 18, -2, 14, 12, -4, 14], 0x5a6a7a);
  main.setStrokeStyle(2, 0x1f2a36);
  const hi = scene.add.polygon(0, -12, [-8, -6, 4, -10, 6, -2, -2, 0], 0x9aaab8);
  // Ore specks
  const s1 = scene.add.circle(-8, -8, 1.4, 0xc4d4e4);
  const s2 = scene.add.circle(6, -4, 1.6, 0xe4ecf4);
  const s3 = scene.add.circle(2, -14, 1.2, 0xc4d4e4);
  c.add([shadow, main, hi, s1, s2, s3]);
  c.setDepth(3);
  return c;
}

// --- Metal room (built with iron) -----------------------------------------

export function drawMetalRoom(scene, cx, cy, size) {
  const c = scene.add.container(cx, cy);
  const half = size / 2;
  const inset = 4;
  // Steel deck
  const floor = scene.add.rectangle(0, 0, size - inset * 2, size - inset * 2, 0x4a5260)
    .setStrokeStyle(2, 0x1f2a36);
  c.add(floor);
  // Plate seams
  const seams = scene.add.graphics();
  seams.lineStyle(1, 0x2a3242, 0.7);
  for (let i = 1; i < 4; i++) {
    const y = -half + inset + i * ((size - inset * 2) / 4);
    seams.beginPath();
    seams.moveTo(-half + inset, y);
    seams.lineTo(half - inset, y);
    seams.strokePath();
  }
  c.add(seams);
  // Solid metal slabs around the perimeter
  const wallColor = 0x5a6a7a;
  const wallStroke = 0x1f2a36;
  const wallThick = 8;
  const top = scene.add.rectangle(0, -half + wallThick / 2, size, wallThick, wallColor).setStrokeStyle(1, wallStroke);
  const bot = scene.add.rectangle(0, half - wallThick / 2, size, wallThick, wallColor).setStrokeStyle(1, wallStroke);
  const lef = scene.add.rectangle(-half + wallThick / 2, 0, wallThick, size, wallColor).setStrokeStyle(1, wallStroke);
  const rig = scene.add.rectangle(half - wallThick / 2, 0, wallThick, size, wallColor).setStrokeStyle(1, wallStroke);
  // Corner rivets
  const rivetColor = 0xc4d4e4;
  const r1 = scene.add.circle(-half + wallThick, -half + wallThick, 2, rivetColor);
  const r2 = scene.add.circle(half - wallThick, -half + wallThick, 2, rivetColor);
  const r3 = scene.add.circle(-half + wallThick, half - wallThick, 2, rivetColor);
  const r4 = scene.add.circle(half - wallThick, half - wallThick, 2, rivetColor);
  c.add([top, bot, lef, rig, r1, r2, r3, r4]);
  c.setDepth(2);
  return c;
}

// --- Campfire --------------------------------------------------------------

// Returns { container, setLit(bool, t) } so ForestScene can flicker the flames.
export function drawCampfire(scene, x, y) {
  const c = scene.add.container(x, y);
  const ring = scene.add.circle(0, 8, 22, 0x2e2a26);
  ring.setStrokeStyle(2, 0x14110d);
  const log1 = scene.add.rectangle(-8, 4, 24, 6, 0x6b3a1f).setRotation(0.4);
  const log2 = scene.add.rectangle(6, 6, 22, 6, 0x6b3a1f).setRotation(-0.5);
  log1.setStrokeStyle(1, 0x2f1d0d);
  log2.setStrokeStyle(1, 0x2f1d0d);
  const flame1 = scene.add.ellipse(0, -6, 18, 26, 0xff7a1a);
  const flame2 = scene.add.ellipse(0, -10, 10, 18, 0xffd24a);
  c.add([ring, log1, log2, flame1, flame2]);
  c.setDepth(4);
  flame1.setVisible(false);
  flame2.setVisible(false);
  return {
    container: c,
    flame1, flame2,
    setLit(lit) {
      flame1.setVisible(lit);
      flame2.setVisible(lit);
    },
    flicker(t) {
      // gentle sine wobble
      flame1.scaleY = 1 + Math.sin(t * 0.012) * 0.12;
      flame2.scaleY = 1 + Math.sin(t * 0.018 + 1) * 0.18;
      flame1.scaleX = 1 + Math.sin(t * 0.009 + 2) * 0.06;
    }
  };
}

// --- Wolf -----------------------------------------------------------------

export function drawWolf(scene, x, y) {
  const c = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 10, 36, 10, 0x000000, 0.45);
  const body = scene.add.ellipse(0, 0, 36, 18, 0x4a4a52);
  body.setStrokeStyle(2, 0x14141a);
  const head = scene.add.circle(14, -4, 9, 0x4a4a52);
  head.setStrokeStyle(2, 0x14141a);
  const ear1 = scene.add.triangle(11, -12, 0, 6, 4, 0, 7, 6, 0x4a4a52);
  const ear2 = scene.add.triangle(17, -12, 0, 6, 4, 0, 7, 6, 0x4a4a52);
  const eye = scene.add.circle(17, -5, 1.5, 0xffe14a);
  c.add([shadow, body, head, ear1, ear2, eye]);
  c.setDepth(5);
  return c;
}

// --- Boss wolf ------------------------------------------------------------

// Bigger, darker wolf with red glowing eyes and a faint red ground glow.
export function drawBoss(scene, x, y) {
  const c = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 18, 64, 16, 0x000000, 0.55);
  const glow = scene.add.circle(0, 18, 28, 0xff3a3a, 0.18);
  const body = scene.add.ellipse(0, 0, 56, 28, 0x2a2a30);
  body.setStrokeStyle(2, 0x14141a);
  const head = scene.add.circle(22, -6, 14, 0x2a2a30);
  head.setStrokeStyle(2, 0x14141a);
  const ear1 = scene.add.triangle(17, -18, 0, 8, 5, 0, 9, 8, 0x2a2a30);
  const ear2 = scene.add.triangle(27, -18, 0, 8, 5, 0, 9, 8, 0x2a2a30);
  const eye1 = scene.add.circle(20, -7, 2.4, 0xff3a3a);
  const eye2 = scene.add.circle(27, -7, 2.4, 0xff3a3a);
  // Subtle spike on the back
  const spike = scene.add.triangle(-6, -8, 0, 0, 6, -10, 12, 0, 0x14141a);
  c.add([shadow, glow, body, spike, head, ear1, ear2, eye1, eye2]);
  c.setDepth(5);
  return c;
}

// --- Player ---------------------------------------------------------------

export function drawPlayer(scene, x, y) {
  const c = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 12, 22, 8, 0x000000, 0.4);
  const body = scene.add.circle(0, 0, 11, 0xf4d8a8);
  body.setStrokeStyle(2, 0x3b2a14);
  const eye1 = scene.add.circle(-3, -2, 1.4, 0x14110d);
  const eye2 = scene.add.circle(3, -2, 1.4, 0x14110d);
  c.add([shadow, body, eye1, eye2]);
  c.setDepth(6);
  return c;
}

// --- Built room (placed via building mode) -------------------------------

// Wooden plank floor with stacked-log walls. `size` is the cell footprint;
// floor inset by 4 px so neighboring rooms read as separate.
export function drawRoom(scene, cx, cy, size) {
  const c = scene.add.container(cx, cy);
  const half = size / 2;
  const inset = 4;
  // Floor
  const floor = scene.add.rectangle(0, 0, size - inset * 2, size - inset * 2, 0x8a5b3a)
    .setStrokeStyle(2, 0x4a2a14);
  c.add(floor);
  // Plank lines
  const planks = scene.add.graphics();
  planks.lineStyle(1, 0x4a2a14, 0.55);
  for (let i = 1; i < 4; i++) {
    const y = -half + inset + i * ((size - inset * 2) / 4);
    planks.beginPath();
    planks.moveTo(-half + inset, y);
    planks.lineTo(half - inset, y);
    planks.strokePath();
  }
  c.add(planks);
  // Log walls (4 sides) — short brown rectangles stacked
  const logColor = 0x6b3a1f;
  const logStroke = 0x2f1d0d;
  const wallThick = 8;
  const top = scene.add.rectangle(0, -half + wallThick / 2, size, wallThick, logColor).setStrokeStyle(1, logStroke);
  const bot = scene.add.rectangle(0, half - wallThick / 2, size, wallThick, logColor).setStrokeStyle(1, logStroke);
  const lef = scene.add.rectangle(-half + wallThick / 2, 0, wallThick, size, logColor).setStrokeStyle(1, logStroke);
  const rig = scene.add.rectangle(half - wallThick / 2, 0, wallThick, size, logColor).setStrokeStyle(1, logStroke);
  c.add([top, bot, lef, rig]);
  c.setDepth(2);
  return c;
}

// Diamond room — pale crystalline floor, gem-cut walls with bright facets.
export function drawDiamondRoom(scene, cx, cy, size) {
  const c = scene.add.container(cx, cy);
  const half = size / 2;
  const inset = 4;
  // Crystal floor
  const floor = scene.add.rectangle(0, 0, size - inset * 2, size - inset * 2, 0x9ce6ee)
    .setStrokeStyle(2, 0x2a6a8a);
  c.add(floor);
  // Faint diagonal facet lines
  const facets = scene.add.graphics();
  facets.lineStyle(1, 0x4aa8d8, 0.5);
  for (let i = -3; i <= 3; i++) {
    const off = i * ((size - inset * 2) / 4);
    facets.beginPath();
    facets.moveTo(-half + inset, -half + inset + off);
    facets.lineTo(half - inset - off, half - inset);
    facets.strokePath();
  }
  c.add(facets);
  // Gem walls
  const wallColor = 0x6ad8e8;
  const wallStroke = 0x1a4a8a;
  const wallThick = 8;
  const top = scene.add.rectangle(0, -half + wallThick / 2, size, wallThick, wallColor).setStrokeStyle(1, wallStroke);
  const bot = scene.add.rectangle(0, half - wallThick / 2, size, wallThick, wallColor).setStrokeStyle(1, wallStroke);
  const lef = scene.add.rectangle(-half + wallThick / 2, 0, wallThick, size, wallColor).setStrokeStyle(1, wallStroke);
  const rig = scene.add.rectangle(half - wallThick / 2, 0, wallThick, size, wallColor).setStrokeStyle(1, wallStroke);
  // Corner gems — small bright diamonds
  const gemColor = 0xffffff;
  const corners = [
    [-half + wallThick, -half + wallThick],
    [ half - wallThick, -half + wallThick],
    [-half + wallThick,  half - wallThick],
    [ half - wallThick,  half - wallThick]
  ];
  const gems = corners.map(([x, y]) =>
    scene.add.polygon(x, y, [0, -3, 3, 0, 0, 3, -3, 0], gemColor).setStrokeStyle(1, 0x4aa8d8)
  );
  c.add([top, bot, lef, rig, ...gems]);
  c.setDepth(2);
  return c;
}

// Ghost room used for placement preview — same shape but tinted, no walls.
export function drawGhostRoom(scene, size) {
  const g = scene.add.rectangle(0, 0, size - 8, size - 8, 0x55ff77, 0.25)
    .setStrokeStyle(3, 0x55ff77, 0.9);
  g.setDepth(40);
  g.setVisible(false);
  return g;
}

// --- Night overlay --------------------------------------------------------

// Single dark rectangle that covers the entire scene, alpha set per-frame
// based on time-of-day. Drawn at very high depth so it sits over everything.
export function makeNightOverlay(scene, w, h) {
  const overlay = scene.add.rectangle(w / 2, h / 2, w, h, 0x06101e, 0);
  overlay.setDepth(50);
  return overlay;
}

// Warm halo around a lit campfire (drawn under the night overlay).
export function makeWarmHalo(scene, x, y, r) {
  const halo = scene.add.circle(x, y, r, 0xffaa55, 0);
  halo.setDepth(49);
  halo.setBlendMode(Phaser.BlendModes.ADD);
  return halo;
}

// --- RNG ------------------------------------------------------------------

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
