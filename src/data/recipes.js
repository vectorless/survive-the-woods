// Crafting recipes opened at the tent (workbench).
// Each recipe has either a `tool` (one-time, adds to ownedTools), a `flag`
// (one-time, sets a registry flag like campfireBuilt), or an `item` (stackable
// inventory yield). Cost is an object of inventory keys → counts.

export const RECIPES = {
  axe: {
    id: 'axe',
    name: 'Axe',
    desc: 'Chop trees for wood. Press 1 to equip.',
    tool: 'axe',
    cost: { wood: 3, stone: 2 }
  },
  spear: {
    id: 'spear',
    name: 'Spear',
    desc: 'Fight wolves. Press 2 to equip.',
    tool: 'spear',
    cost: { wood: 2, stone: 1 }
  },
  trailMix: {
    id: 'trailMix',
    name: 'Trail Mix',
    desc: 'Compact food. Restores more hunger than a berry.',
    item: { key: 'trailMix', amount: 1 },
    cost: { berries: 5 }
  },
  campfire: {
    id: 'campfire',
    name: 'Build Campfire',
    desc: 'One-time. Place a fire pit by the tent. Feed it wood at dusk to stay warm at night.',
    flag: 'campfireBuilt',
    cost: { wood: 3 }
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    desc: 'Forge 3 iron into 1 diamond. Used to build the toughest rooms.',
    item: { key: 'diamond', amount: 1 },
    cost: { iron: 3 }
  }
};

export const RECIPES_ORDER = ['axe', 'spear', 'campfire', 'trailMix', 'diamond'];
