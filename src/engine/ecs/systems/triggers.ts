/**
 * Trigger System - AABB collision detection for refuel stations
 * 
 * SOLID Principle: Single Responsibility - Only handles trigger collisions
 * DRY Principle: Uses shared collision utility instead of duplicating logic
 */
import type { World } from '../world.js';
import type { System } from '../types.js';
import type { Position } from '../components/position.js';
import type { FuelSystem } from './fuelSystem.js';
import { checkAABBCollision, createShipBoundingBox } from '../../utils/collision.js';
import { CONFIG } from '../../../config.js';

export interface Trigger {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'refuel';
}

export class TriggersSystem implements System {
  private triggers: Trigger[] = [];
  private fuelSystem: FuelSystem;

  constructor(fuelSystem: FuelSystem) {
    this.fuelSystem = fuelSystem;
  }

  addTrigger(trigger: Trigger): void {
    this.triggers.push(trigger);
  }

  removeTrigger(id: string): void {
    const index = this.triggers.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.triggers.splice(index, 1);
    }
  }

  update(_dt: number, world: World): void {
    // Check ship position against refuel triggers
    const ships = world.getEntitiesWith(['position', 'fuel', 'sprite']);

    for (const shipId of ships) {
      const position = world.getComponent<Position>(shipId, 'position');
      if (!position) continue;

      // Use shared collision utility (DRY principle)
      const shipBox = createShipBoundingBox(position.x, position.y);
      
      for (const trigger of this.triggers) {
        const triggerBox = {
          x: trigger.x,
          y: trigger.y,
          width: trigger.width,
          height: trigger.height,
        };
        
        if (checkAABBCollision(shipBox, triggerBox)) {
          // Collision detected
          if (trigger.type === 'refuel') {
            // Use config constant instead of magic number (DRY principle)
            this.fuelSystem.refuel(world, shipId, CONFIG.FUEL_REFUEL_AMOUNT);
          }
        }
      }
    }
  }
}

