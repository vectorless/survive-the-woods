// All progression state lives on scene.registry. Mutators here are the only
// callers of registry.set, so individual scenes never have to know which keys
// are normalized/clamped.

import { RECIPES } from './data/recipes.js';

export const MAX_BAR = 100;

export function initState(registry) {
  registry.set('hunger', MAX_BAR);
  registry.set('health', MAX_BAR);
  registry.set('stamina', MAX_BAR);

  registry.set('inventory', { wood: 0, stone: 0, iron: 0, diamond: 0, berries: 0, trailMix: 0, mushroom: 0, fish: 0 });
  registry.set('ownedTools', []);   // 'axe' / 'spear'
  registry.set('equipped', null);   // 'axe' | 'spear' | null

  registry.set('campfireBuilt', false);
  registry.set('campfireLit', false);     // true between dusk-feed and next dawn

  registry.set('daysSurvived', 0);
  registry.set('timeOfDay', 0);            // 0..1 fraction of dayLengthSec
  registry.set('isNight', false);

  registry.set('worldSeed', Math.floor(Math.random() * 1e9));
  registry.set('sprintMult', 1);           // WalkController reads this each tick
  registry.set('gameOver', false);
}

// Reset everything for a fresh run (called from GameOverScene → restart).
export function resetState(registry) {
  initState(registry);
}

// --- Bars -----------------------------------------------------------------

function clamp(n) { return Math.max(0, Math.min(MAX_BAR, n)); }

export function adjustHunger(registry, delta) {
  const next = clamp((registry.get('hunger') ?? MAX_BAR) + delta);
  registry.set('hunger', next);
  return next;
}

export function adjustHealth(registry, delta) {
  const next = clamp((registry.get('health') ?? MAX_BAR) + delta);
  registry.set('health', next);
  return next;
}

export function adjustStamina(registry, delta) {
  const next = clamp((registry.get('stamina') ?? MAX_BAR) + delta);
  registry.set('stamina', next);
  return next;
}

export function hasStamina(registry, cost) {
  return (registry.get('stamina') ?? 0) >= cost;
}

// --- Inventory ------------------------------------------------------------

export function addItem(registry, key, amount = 1) {
  const inv = { ...(registry.get('inventory') || {}) };
  inv[key] = (inv[key] || 0) + amount;
  registry.set('inventory', inv);
  return inv[key];
}

export function removeItem(registry, key, amount = 1) {
  const inv = { ...(registry.get('inventory') || {}) };
  if ((inv[key] || 0) < amount) return false;
  inv[key] -= amount;
  registry.set('inventory', inv);
  return true;
}

export function getItem(registry, key) {
  return (registry.get('inventory') || {})[key] || 0;
}

// --- Tools / equipment ----------------------------------------------------

export function ownsTool(registry, tool) {
  return (registry.get('ownedTools') || []).includes(tool);
}

export function addTool(registry, tool) {
  const owned = registry.get('ownedTools') || [];
  if (owned.includes(tool)) return;
  registry.set('ownedTools', [...owned, tool]);
}

export function equipTool(registry, tool) {
  if (tool && !ownsTool(registry, tool)) return false;
  registry.set('equipped', tool);
  return true;
}

// --- Crafting -------------------------------------------------------------

export function canCraft(registry, recipeId) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return false;
  if (recipe.tool && ownsTool(registry, recipe.tool)) return false;
  if (recipe.flag && registry.get(recipe.flag)) return false;
  for (const [key, amount] of Object.entries(recipe.cost)) {
    if (getItem(registry, key) < amount) return false;
  }
  return true;
}

export function craft(registry, recipeId) {
  if (!canCraft(registry, recipeId)) return false;
  const recipe = RECIPES[recipeId];
  for (const [key, amount] of Object.entries(recipe.cost)) {
    removeItem(registry, key, amount);
  }
  if (recipe.tool) addTool(registry, recipe.tool);
  if (recipe.flag) registry.set(recipe.flag, true);
  if (recipe.item) addItem(registry, recipe.item.key, recipe.item.amount);
  return true;
}
