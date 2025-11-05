/**
 * Fuel System - drains fuel when moving, handles refuel triggers
 */
import type { World } from '../world.js';
import type { System } from '../../loop.js';
import type { Fuel } from '../components/fuel.js';
import type { Velocity } from '../components/velocity.js';
import type { EventBus } from '../../events.js';

export class FuelSystem implements System {
  private eventBus: EventBus;
  private drainRate = 10; // fuel per second when moving
  private fuelEmptyEmitted = new Set<number>(); // Track which entities have already emitted fuel:empty

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  update(dt: number, world: World): void {
    const dtSeconds = dt / 1000;

    // Drain fuel when moving
    world.forEachEntity(['fuel', 'velocity'], (entityId) => {
      const fuel = world.getComponent<Fuel>(entityId, 'fuel')!;
      const velocity = world.getComponent<Velocity>(entityId, 'velocity')!;

      // Check if moving
      const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
      if (speed > 0.01) {
        // Moving - drain fuel
        fuel.current -= this.drainRate * dtSeconds;
        if (fuel.current < 0) {
          fuel.current = 0;
          // Only emit once per entity when fuel first reaches 0
          if (!this.fuelEmptyEmitted.has(entityId)) {
            this.fuelEmptyEmitted.add(entityId);
            this.eventBus.emit('fuel:empty');
          }
        }
      } else if (fuel.current > 0) {
        // If fuel is restored and entity is not moving, reset the flag
        this.fuelEmptyEmitted.delete(entityId);
      }
    });
  }

  /**
   * Refuel an entity (called by trigger system or scene)
   */
  refuel(world: World, entityId: number, amount: number): void {
    const fuel = world.getComponent<Fuel>(entityId, 'fuel');
    if (!fuel) return;

    fuel.current = Math.min(fuel.current + amount, fuel.max);
    // Reset fuel empty flag when refueled
    this.fuelEmptyEmitted.delete(entityId);
    this.eventBus.emit('fuel:refueled', { amount });
  }
}

