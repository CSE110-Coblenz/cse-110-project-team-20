/**
 * Trigger System - AABB collision detection for refuel stations
 */
import type { World } from '../world.js';
import type { System } from '../../loop.js';
import type { Position } from '../components/position.js';
import type { FuelSystem } from './fuelSystem.js';

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

      // Simple AABB check with trigger boxes
      for (const trigger of this.triggers) {
        if (
          position.x < trigger.x + trigger.width &&
          position.x + 40 > trigger.x && // ship width
          position.y < trigger.y + trigger.height &&
          position.y + 40 > trigger.y // ship height
        ) {
          // Collision detected
          if (trigger.type === 'refuel') {
            this.fuelSystem.refuel(world, shipId, 100); // Refuel to max
          }
        }
      }
    }
  }
}

