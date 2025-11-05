/**
 * FuelSystem tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FuelSystem } from '../engine/ecs/systems/fuelSystem.js';
import { World } from '../engine/ecs/world.js';
import { createFuel } from '../engine/ecs/components/fuel.js';
import { createVelocity } from '../engine/ecs/components/velocity.js';
import { createEventBus } from '../engine/events.js';

describe('FuelSystem', () => {
  let world: World;
  let fuelSystem: FuelSystem;
  let eventBus: ReturnType<typeof createEventBus>;

  beforeEach(() => {
    world = new World();
    eventBus = createEventBus();
    fuelSystem = new FuelSystem(eventBus);
  });

  it('should drain fuel when entity is moving', () => {
    const entityId = world.createEntity();
    world.addComponent(entityId, createFuel(100, 100));
    world.addComponent(entityId, createVelocity(10, 10)); // Moving

    // Update for 1 second (1000ms)
    fuelSystem.update(1000, world);

    const fuel = world.getComponent<import('../engine/ecs/components/fuel.js').Fuel>(entityId, 'fuel');
    expect(fuel?.current).toBeLessThan(100);
    expect(fuel?.current).toBeGreaterThan(90); // Should have drained ~10
  });

  it('should not drain fuel when entity is stationary', () => {
    const entityId = world.createEntity();
    world.addComponent(entityId, createFuel(100, 100));
    world.addComponent(entityId, createVelocity(0, 0)); // Not moving

    fuelSystem.update(1000, world);

    const fuel = world.getComponent<import('../engine/ecs/components/fuel.js').Fuel>(entityId, 'fuel');
    expect(fuel?.current).toBe(100);
  });

  it('should emit fuel:empty when fuel reaches zero', () => {
    const handler = vi.fn();
    eventBus.on('fuel:empty', handler);

    const entityId = world.createEntity();
    world.addComponent(entityId, createFuel(10, 10)); // Low fuel
    world.addComponent(entityId, createVelocity(10, 10));

    // Update until fuel is empty
    for (let i = 0; i < 20; i++) {
      fuelSystem.update(100, world);
      if (handler.mock.calls.length > 0) break;
    }

    expect(handler).toHaveBeenCalled();
    const fuel = world.getComponent<import('../engine/ecs/components/fuel.js').Fuel>(entityId, 'fuel');
    expect(fuel?.current).toBe(0);
  });

  it('should refuel entity correctly', () => {
    const entityId = world.createEntity();
    world.addComponent(entityId, createFuel(100, 50)); // Half fuel

    fuelSystem.refuel(world, entityId, 30);

    const fuel = world.getComponent<import('../engine/ecs/components/fuel.js').Fuel>(entityId, 'fuel');
    expect(fuel?.current).toBe(80);
  });

  it('should not exceed max fuel when refueling', () => {
    const entityId = world.createEntity();
    world.addComponent(entityId, createFuel(100, 90));

    fuelSystem.refuel(world, entityId, 50);

    const fuel = world.getComponent<import('../engine/ecs/components/fuel.js').Fuel>(entityId, 'fuel');
    expect(fuel?.current).toBe(100); // Capped at max
  });

  it('should emit fuel:refueled event', () => {
    const handler = vi.fn();
    eventBus.on('fuel:refueled', handler);

    const entityId = world.createEntity();
    world.addComponent(entityId, createFuel(100, 50));

    fuelSystem.refuel(world, entityId, 20);

    expect(handler).toHaveBeenCalledWith({ amount: 20 });
  });
});

