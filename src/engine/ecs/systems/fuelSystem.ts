/**
 * Fuel System - drains fuel when moving, handles refuel triggers
 *
 * SOLID Principle: Single Responsibility - Only handles fuel consumption and refueling
 *
 * This system is responsible for:
 * - Draining fuel when entities are moving
 * - Emitting events when fuel is empty
 * - Refueling entities when requested
 */
import type { World } from '../world.js';
import type { System } from '../types.js';
import type { Fuel } from '../components/fuel.js';
import type { Velocity } from '../components/velocity.js';
import type { EventBus } from '../../events.js';
import { EventTopics } from '../../events/topics.js';

export class FuelSystem implements System {
  private eventBus: EventBus;
  // Fuel drain rate: 7 units per second when moving
  // This is a system-specific constant (not in CONFIG) because different
  // game modes might want different drain rates
  private drainRate = 7; // fuel per second when moving
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
      const speed = Math.sqrt(
        velocity.vx * velocity.vx + velocity.vy * velocity.vy
      );
      if (speed > 0.01) {
        // Moving - drain fuel
        fuel.current -= this.drainRate * dtSeconds;
        if (fuel.current < 0) {
          fuel.current = 0;
        }
      }

      // Check if fuel is empty (whether moving or not) and emit event once
      if (fuel.current <= 0 && !this.fuelEmptyEmitted.has(entityId)) {
        this.fuelEmptyEmitted.add(entityId);
        this.eventBus.emit(EventTopics.FUEL_EMPTY);
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
    this.eventBus.emit(EventTopics.FUEL_REFUELED, { amount });
  }
}
