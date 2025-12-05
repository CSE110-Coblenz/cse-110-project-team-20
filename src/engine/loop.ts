/**
 * Fixed timestep game loop with accumulator pattern
 */
import { now } from './time.js';
import { CONFIG } from '../config.js';
import type { SceneManager } from './sceneManager.js';
import type { World } from './ecs/world.js';
import type { System } from './ecs/types.js';

export class GameLoop {
  private sceneManager: SceneManager;
  private world: World;
  private systems: System[] = [];
  private running = false;
  private lastFrameTime = 0;
  private accumulator = 0;
  private readonly fixedStep = CONFIG.FIXED_TIMESTEP;
  private readonly maxFrameTime = CONFIG.MAX_FRAME_TIME;

  constructor(sceneManager: SceneManager, world: World) {
    this.sceneManager = sceneManager;
    this.world = world;
    // Systems will be registered separately
  }

  registerSystem(system: System): void {
    this.systems.push(system);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = now();
    this.tick();
  }

  stop(): void {
    this.running = false;
  }

  private tick = (): void => {
    if (!this.running) return;

    const currentTime = now();
    let frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Cap frame time to prevent spiral of death
    if (frameTime > this.maxFrameTime) {
      frameTime = this.maxFrameTime;
    }

    // Accumulate frame time
    this.accumulator += frameTime;

    // Fixed timestep updates
    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    // Render (variable timestep interpolation could go here)
    this.render();

    requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    // Update all systems
    for (const system of this.systems) {
      system.update(dt, this.world);
    }

    // Update current scene
    this.sceneManager.update(dt);
  }

  private render(): void {
    this.sceneManager.render();
  }
}
