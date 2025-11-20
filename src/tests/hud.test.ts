import { describe, it, expect, beforeEach} from 'vitest';
import { HUD } from '../ui/hud.js';
import { World } from '../engine/ecs/world.js';
import { createEventBus } from '../engine/events.js';

describe('HudSystem', () => {
  let world: World;
  let hudSystem: HUD;
  let eventBus: ReturnType<typeof createEventBus>;

  beforeEach(() => {
    world = new World();
    eventBus = createEventBus();
    hudSystem = new HUD();
  });

  it('should initialise the HUD and append to document body', () => {
    // ensures the HUD is added to the DOM
    const hud = new HUD();
    expect(document.body.contains(hud['container'])).toBe(true);
  });

  it('should update fuel bar width correctly', () => {
    // ensures the fuel bar width and text updates correctly
    const hud = new HUD();
    // 0 %
    hud.updateFuel(0, 100);
    expect(hud['fuelBarFill'].style.width).toBe('0%');
    expect(hud['fuelText'].textContent).toBe('Fuel: 0.0/100');
    // 50%
    hud.updateFuel(50, 100);
    expect(hud['fuelBarFill'].style.width).toBe('50%');
    expect(hud['fuelText'].textContent).toBe('Fuel: 50.0/100');
    // 100%
    hud.updateFuel(100, 100);
    expect(hud['fuelBarFill'].style.width).toBe('100%');
    expect(hud['fuelText'].textContent).toBe('Fuel: 100.0/100');
  });
  
  it('should cap the fuel bar width between 0% and 100%', () => {
    const hud = new HUD();
    // > 100%
    hud.updateFuel(150, 100);
    expect(hud['fuelBarFill'].style.width).toBe('100%');
    expect(hud['fuelText'].textContent).toBe('Fuel: 100.0/100');
    // Below 0%
    hud.updateFuel(-50, 100);
    expect(hud['fuelBarFill'].style.width).toBe('0%');
    expect(hud['fuelText'].textContent).toBe('Fuel: 0.0/100');
  });

  it('should remove HUD from DOM on disposal', () => {
    const hud = new HUD();
    hud.dispose();
    expect(document.body.contains(hud['container'])).toBe(false);
  });

});