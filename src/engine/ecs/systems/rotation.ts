/**
 * Rotation System - updates entity rotation to face movement direction
 */
import type { World } from '../world.js';
import type { System } from '../../loop.js';
import type { Position } from '../components/position.js';
import type { Velocity } from '../components/velocity.js';

export class RotationSystem implements System {
  /**
   * Update rotation for entities with Position, Velocity, and angle
   * Ship image faces up by default (0° = up)
   * Rotation mapping: Right = 90°, Down = 180°, Left = 270°, Up = 0°
   */
  update(dt: number, world: World): void {
    world.forEachEntity(['position', 'velocity'], (entityId) => {
      const position = world.getComponent<Position>(entityId, 'position')!;
      const velocity = world.getComponent<Velocity>(entityId, 'velocity')!;

      // Calculate speed
      const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
      
      if (speed > 0.01) {
        // atan2(vy, vx) gives: Right=0°, Down=90°, Left=180°, Up=-90°
        // We add 90° to convert: Right=90°, Down=180°, Left=270°, Up=0°
        const angleRad = Math.atan2(velocity.vy, velocity.vx);
        let angleDeg = (angleRad * 180) / Math.PI + 90;
        
        // Normalize to 0-360 range
        if (angleDeg < 0) angleDeg += 360;
        if (angleDeg >= 360) angleDeg -= 360;
        
        position.angle = angleDeg;
      }
    });
  }
}

