# Survive the Woods (prototype)

Top-down forest survival. Pick berries → eat → craft tools → survive nights → repeat. Score = days survived.

## Loop (one day)

1. **Day** — wander the woods (WASD, Shift to sprint). Pick berries (E on bush), mine stone (E on rock), grab loose sticks off the ground (E on stick → +1 wood; the bootstrap before you have an axe).
2. **Workbench** — walk inside the tent radius, press E to open the workbench. Craft an axe (wood + stone) so you can chop trees.
3. **Trees** — equip axe (`1`), chop trees (E) for wood. Craft a spear (`2`) for wolves and a campfire (one-time, wood ×3) for warmth.
4. **Dusk** — feed the campfire 1 wood (E at the fire) to keep its warm halo lit through the night.
5. **Night** — wolves spawn and chase you. Stay in the tent radius (heals) or the campfire halo (no cold damage), or fight back with the spear.
6. **Dawn** — surviving the night ticks the day counter. Fire goes out; refeed it.

## Bars

- **Hunger** — drains over one day. Press `Q` to eat berries (+18) or trail-mix (+55). At 0 it eats your health.
- **Health** — regens inside the tent radius. Drains from cold (night, no fire), wolf bites, or starvation. 0 → game over.
- **Stamina** — drains on sprint, chop, mine, spear. Regens when idle. Below an action's cost → action refuses.

## Hotkeys

| Key | Action |
| --- | ------ |
| `WASD` / arrows | Walk (8-way) |
| `Shift` | Sprint (drains stamina) |
| `E` | Interact (pick / chop / mine / pick stick / open workbench / feed fire / spear) |
| `Q` | Eat (trail mix first, then berry) |
| `Z` | Open inventory |
| `F` | Toggle building mode (ghost room snaps to a 80px grid at your feet) |
| `TAB` | (in building mode) Cycle material: wood → metal → diamond |
| `SPACE` | (in building mode) Place a room — 6 wood / 4 iron / 2 diamond depending on material (HP 20 / 40 / 80) |
| `1` | Hotbar slot — toggle axe |
| `2` | Hotbar slot — toggle spear |
| `3` | Hotbar slot — eat berry |
| `4` | Hotbar slot — eat trail mix |
| `5` | Hotbar slot — eat mushroom (20% poison, 80% fully fills hunger) |
| `6` | Hotbar slot — eat fish |
| `ESC` | Close workbench / inventory |

## Architecture invariants — keep these

- **Phaser scenes are modes.** `ForestScene` is the hub; `CraftScene` launches as a paused overlay; `HUDScene` is launched once and persists; `GameOverScene` swaps in on death.
- **Game state lives on `scene.registry`** — `hunger`, `health`, `stamina`, `inventory`, `ownedTools`, `equipped`, `campfireBuilt`, `campfireLit`, `daysSurvived`, `timeOfDay`, `isNight`, `worldSeed`, `sprintMult`, `gameOver`. Mutators in `src/state.js`. Never `registry.set` from a scene unless updating one of the live signals (`sprintMult`, `timeOfDay`, `isNight`, `campfireLit`).
- **Content is data, not classes.** `src/data/{world,recipes,animals}.js` are tweak-here knobs. Add a recipe by editing `recipes.js`; rebalance hunger by editing `world.js`.
- **WalkController is decoupled from sprint key.** It reads `registry.sprintMult` each tick; `ForestScene` decides whether sprint is allowed (Shift held + moving + stamina > 0).
- **World layout is deterministic from `worldSeed`.** A restart re-seeds for variety while a single run is stable.
- **Use `delta` (ms) for everything time-based** — movement, hunger drain, time-of-day, regrowth, wolf AI.

## Run

```
npm install
npm run dev
```

Vite binds 127.0.0.1:5173.

## Deferred (not in v1)

Save/load, sound, animation polish, mobile/touch, cooking (raw → cooked meat), hunting deer, more recipes (bow/traps/walls/bedroll), weather (rain/fog), multiple biomes/scene swaps.
