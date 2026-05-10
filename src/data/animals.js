// Hostile animal stats.

// Per-shot damage values (spear, turrets) all reference these. We keep wolf hp
// at 6 (LCM of 1, 2, 3) so weak/good/great turrets can kill in 3/2/1 shots
// with integer damage values. Spear does 3 dmg → still kills a wolf in 2 hits.
export const WOLF = {
  speed: 95,              // px/sec
  hp: 6,                  // 2 spear hits (3 dmg each) or 3/2/1 turret shots
  contactDamage: 18,      // hp per bite
  contactCooldownMs: 800, // min ms between bites on the same player
  radius: 14,             // hit radius
  spawnDistFromPlayer: 700 // off-camera spawn distance
};

export const BOSS = {
  speed: 105,
  hp: 30,                  // 10 spear hits (3 dmg each)
  contactDamage: 28,
  contactCooldownMs: 1000,
  radius: 22,
  spawnDistFromPlayer: 800,
  roomDamage: 4            // 5 hits to break a 20-hp room
};

export const SPEAR_DAMAGE = 3;
