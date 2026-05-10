// World layout, timing constants, drain rates. Tweak here, not in scenes.

export const WORLD = {
  width: 4800,
  height: 4800,
  tent: { x: 2400, y: 2400, healRadius: 130 },
  campfire: { x: 2620, y: 2480, warmRadius: 160 },
  bushCount: 9,
  treeCount: 18,
  rockCount: 10,
  stickCount: 16,
  mushroomCount: 12,
  pondCount: 4,
  // Min distance any spawnable resource keeps from the tent (so the camp isn't
  // crowded) and from each other.
  spawnPadFromTent: 220,
  spawnPadFromEachOther: 90
};

// One full day cycle (real-time seconds). Day = bright; night = dark + cold + wolves.
export const TIME = {
  dayLengthSec: 180,        // total cycle
  daylightFraction: 0.66,   // first 66% is day, rest is night
  duskFraction: 0.04        // sunset transition window inside daylight portion
};

// Bar drain/regen rates (per second).
export const RATES = {
  hungerDrain: 100 / 420,        // empties in ~7 minutes (~2 full day cycles)
  staminaRegen: 22,              // when idle (not sprinting / not just acted)
  staminaSprintDrain: 30,        // while sprinting and moving
  tentHeal: 5                    // hp/sec inside healRadius
};

// Action stamina costs.
export const COSTS = {
  pickBerry: 5,
  pickStick: 3,
  pickMushroom: 4,
  fish: 8,
  chopTree: 20,
  mineRock: 12,
  spearThrust: 18
};

// How much hunger food restores.
export const FOOD = {
  berry: 18,
  trailMix: 55,
  fish: 35
};

// Mushroom: gamble on every bite. The poison chance is rolled live (not seeded)
// so each meal is genuinely a coin flip.
export const MUSHROOM = {
  poisonChance: 0.2,
  poisonDamage: 25  // hp lost when you draw the bad one
};

// Resource regrowth (ms).
export const REGROW_MS = {
  bush: 180_000,
  tree: 120_000,
  rock: 150_000,
  stick: 75_000,
  mushroom: 130_000,
  pondFish: 30_000   // a pond's fish stock refills 30s after a catch
};

export const TREE_HP = 3;     // chops to fell
export const SPEAR_HITS = 2;  // hits to kill a wolf
export const PLAYER_RADIUS = 12;
export const INTERACT_RADIUS = 56;

// Building system — F to enter build mode, SPACE to place a room.
export const BUILDING = {
  cellSize: 80,            // grid pitch + room footprint
  woodPerRoom: 6,
  ironPerMetalRoom: 4,
  diamondPerDiamondRoom: 2,
  roomHp: 20,              // wolf bites a wood room takes to break
  metalRoomHp: 40,         // 2× tougher
  diamondRoomHp: 80        // 4× tougher
};

// Crafted at the workbench from iron — used to build diamond rooms.
export const DIAMOND_PER_CRAFT = 3;

// Mine — separate scrolling scene reached via a built entrance near the tent.
// Layout is a tall vertical shaft; player walks down to find rocks + crystal pods.
export const MINE = {
  width: 1100,
  height: 4400,
  entrance: { x: 2160, y: 2560 }, // position in the forest world (near tent)
  shaftTop: 120,                  // y of the ladder/exit
  rockCount: 70,
  crystalPodCount: 22,
  spawnPad: 96
};

// Roll order for crystal pods. Probabilities sum to 1; the loop in
// MineScene picks the first whose cumulative ceiling beats Math.random().
export const CRYSTAL_ROLL = [
  { key: 'yellowCrystal', name: 'yellow', color: 0xffe14a, chance: 0.5 },
  { key: 'blueCrystal',   name: 'blue',   color: 0x4aa8ff, chance: 0.3 },
  { key: 'greenCrystal',  name: 'green',  color: 0x4ad88a, chance: 0.2 }
];

// 45% of rocks spawn as iron — same shape, bluish tint. Iron ore drops 1 iron
// instead of 1 stone when mined.
export const IRON_ROCK_CHANCE = 0.45;

// Per-night escalation. baseline = night 0 (= the first night).
// daysSurvived increments at dawn, so on night N you face wolfSpeed for N
// surviving nights so far (which is what we want — first night is baseline).
export const WOLF_SCALE = {
  maxAliveMult: 2,        // doubles each night: 1 → 2 → 4 → 8 → 16 ...
  spawnGapDivisor: 2,     // halves each night: 18 → 9 → 4.5 → 2.25 ...
  spawnGapFloor: 1,
  speedBonus: 14,         // +14 px/sec per night
  speedCap: 220,
  // Boss unlock — starting on this night, after this many wolves have spawned,
  // (nightNumber − unlockNight + 1) bosses are spawned that night.
  bossUnlockNight: 8,
  bossUnlockSpawns: 64
};

// Sprint multiplier (passed via registry to WalkController).
export const SPRINT_MULT = 1.6;

// Wolf spawn pacing.
export const WOLF_SPAWN_GAP_SEC = 18;  // a wolf appears at most this often
export const WOLF_NIGHT_INITIAL_DELAY_SEC = 4;
export const WOLF_MAX_ALIVE = 1;  // night-1 baseline; doubles per night via WOLF_SCALE
