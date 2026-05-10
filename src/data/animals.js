// Hostile animal stats.

// Per-shot damage values (spear, turrets) all reference these. We keep wolf hp
// at 6 (LCM of 1, 2, 3) so weak/good/great turrets can kill in 3/2/1 shots
// with integer damage values. Spear does 3 dmg → still kills a wolf in 2 hits.
export const WOLF = {
  speed: 110,             // px/sec (bumped from 95 — wolves close gaps faster)
  hp: 6,                  // 2 spear hits (3 dmg each) or 3/2/1 turret shots
  contactDamage: 22,      // bumped from 18
  contactCooldownMs: 800, // min ms between bites on the same player
  radius: 14,             // hit radius
  spawnDistFromPlayer: 700 // off-camera spawn distance
};

export const BOSS = {
  speed: 120,              // bumped from 105
  hp: 30,                  // 10 spear hits (3 dmg each)
  contactDamage: 36,       // bumped from 28
  contactCooldownMs: 1000,
  radius: 22,
  spawnDistFromPlayer: 800,
  roomDamage: 5            // bumped from 4 — bosses chew rooms faster
};

export const SPEAR_DAMAGE = 3;
