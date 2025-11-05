/**
 * Obstacle System - detects collisions with obstacles and drains fuel
 */
import type { World } from '../world.js';
import type { System } from '../../loop.js';
import type { Position } from '../components/position.js';
import type { Fuel } from '../components/fuel.js';

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fuelDrain: number; // Amount of fuel to drain per collision
}

export class ObstaclesSystem implements System {
  private obstacles: Obstacle[] = [];
  private collisionCooldown = new Map<number, number>(); // entityId -> last collision time
  private readonly COOLDOWN_MS = 500; // Prevent multiple collisions in quick succession

  addObstacle(obstacle: Obstacle): void {
    this.obstacles.push(obstacle);
  }

  removeObstacle(id: string): void {
    const index = this.obstacles.findIndex((o) => o.id === id);
    if (index !== -1) {
      this.obstacles.splice(index, 1);
    }
  }

  update(_dt: number, world: World): void {
    // Check ship position against obstacles
    const ships = world.getEntitiesWith(['position', 'fuel', 'sprite']);

    for (const shipId of ships) {
      const position = world.getComponent<Position>(shipId, 'position');
      const fuel = world.getComponent<Fuel>(shipId, 'fuel');
      if (!position || !fuel) continue;

      // Check cooldown
      const lastCollision = this.collisionCooldown.get(shipId) || 0;
      const now = Date.now();
      if (now - lastCollision < this.COOLDOWN_MS) continue;

      // Simple AABB check with obstacle boxes
      for (const obstacle of this.obstacles) {
        if (
          position.x < obstacle.x + obstacle.width &&
          position.x + 50 > obstacle.x && // ship width (50x50)
          position.y < obstacle.y + obstacle.height &&
          position.y + 50 > obstacle.y // ship height (50x50)
        ) {
          // Collision detected - drain fuel
          fuel.current = Math.max(0, fuel.current - obstacle.fuelDrain);
          this.collisionCooldown.set(shipId, now);
          
          // Emit event for feedback
          // You can add visual feedback here if needed
          break; // Only one collision per frame
        }
      }
    }
  }
}

