/**
 * Movement System - updates Position based on Velocity
 * No allocations in hot path
 */
import type { World } from '../world.js';
import type { System } from '../../loop.js';
import type { Position } from '../components/position.js';
import type { Velocity } from '../components/velocity.js';

export class MovementSystem implements System {
  update(dt: number, world: World): void {
    // Convert dt from ms to seconds
    const dtSeconds = dt / 1000;

    // Get all entities with Position and Velocity
    world.forEachEntity(['position', 'velocity'], (entityId) => {
      const position = world.getComponent<Position>(entityId, 'position')!;
      const velocity = world.getComponent<Velocity>(entityId, 'velocity')!;

      // Update position (mutable update, no allocation)
      position.x += velocity.vx * dtSeconds;
      position.y += velocity.vy * dtSeconds;
    });
  }
}

