// Hostile animal stats.

export const WOLF = {
  speed: 95,              // px/sec
  hp: 2,                  // matches SPEAR_HITS in world.js
  contactDamage: 18,      // hp per bite
  contactCooldownMs: 800, // min ms between bites on the same player
  radius: 14,             // hit radius
  spawnDistFromPlayer: 700 // off-camera spawn distance
};

export const BOSS = {
  speed: 105,
  hp: 10,                  // 10 spear hits to kill
  contactDamage: 28,
  contactCooldownMs: 1000,
  radius: 22,
  spawnDistFromPlayer: 800,
  roomDamage: 4            // 5 hits to break a 20-hp room
};
