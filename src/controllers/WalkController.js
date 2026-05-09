// 8-way walk for ForestScene. Speed normalized on diagonals.
// Effective speed = BASE_SPEED * (registry.sprintMult || 1), so the scene can
// drive sprint via state without us reading the keyboard for Shift in here.

const BASE_SPEED = 200; // px/sec

export class WalkController {
  constructor(scene, sprite) {
    this.scene = scene;
    this.sprite = sprite;
    this.keys = scene.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upArrow: 'UP', downArrow: 'DOWN', leftArrow: 'LEFT', rightArrow: 'RIGHT'
    });
    this.lastDir = { x: 1, y: 0 }; // remembered facing for spear thrust
    this.moving = false;
  }

  update(deltaMs) {
    const dt = deltaMs / 1000;
    const k = this.keys;
    let dx = 0, dy = 0;
    if (k.up.isDown || k.upArrow.isDown) dy -= 1;
    if (k.down.isDown || k.downArrow.isDown) dy += 1;
    if (k.left.isDown || k.leftArrow.isDown) dx -= 1;
    if (k.right.isDown || k.rightArrow.isDown) dx += 1;

    if (dx === 0 && dy === 0) {
      this.moving = false;
      return;
    }
    this.moving = true;
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    this.lastDir = { x: dx, y: dy };
    const sprint = this.scene.registry.get('sprintMult') || 1;
    const speed = BASE_SPEED * sprint;
    this.sprite.x += dx * speed * dt;
    this.sprite.y += dy * speed * dt;

    const cb = this.scene.cameras.main.getBounds();
    this.sprite.x = Math.max(cb.x + 8, Math.min(cb.right - 8, this.sprite.x));
    this.sprite.y = Math.max(cb.y + 8, Math.min(cb.bottom - 8, this.sprite.y));
  }
}
