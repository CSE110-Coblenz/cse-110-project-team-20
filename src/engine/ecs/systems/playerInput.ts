/**
 * Player Input System - handles keyboard input and sets velocity for player-controlled entities
 */
import type { World } from '../world.js';
import type { System } from '../../loop.js';
import type { Velocity } from '../components/velocity.js';
import type { Keyboard } from '../../../input/keyboard.js';

export class PlayerInputSystem implements System {
  private keyboard: Keyboard;
  private speed: number;
  private playerEntityId: number | null = null;
  private enabled: boolean = true;
  private conditionCheck: (() => boolean) | null = null;

  constructor(keyboard: Keyboard, speed: number = 200) {
    this.keyboard = keyboard;
    this.speed = speed; // pixels per second
  }

  /**
   * Set the player entity ID (the ship that should respond to input)
   */
  setPlayerEntity(entityId: number): void {
    this.playerEntityId = entityId;
  }

  /**
   * Clear the player entity
   */
  clearPlayerEntity(): void {
    this.playerEntityId = null;
  }

  /**
   * Enable or disable input processing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set a condition function that must return true for input to be processed
   */
  setCondition(condition: (() => boolean) | null): void {
    this.conditionCheck = condition;
  }

  update(dt: number, world: World): void {
    if (this.playerEntityId === null || !this.enabled) return;
    
    // Check condition if set
    if (this.conditionCheck && !this.conditionCheck()) {
      // Condition failed - stop movement
      const velocity = world.getComponent<Velocity>(this.playerEntityId, 'velocity');
      if (velocity) {
        velocity.vx = 0;
        velocity.vy = 0;
      }
      return;
    }

    const velocity = world.getComponent<Velocity>(this.playerEntityId, 'velocity');
    if (!velocity) return;

    const keys = this.keyboard.getState();

    // Reset velocity
    velocity.vx = 0;
    velocity.vy = 0;

    // Set velocity based on input
    if (keys.left) velocity.vx = -this.speed;
    if (keys.right) velocity.vx = this.speed;
    if (keys.up) velocity.vy = -this.speed;
    if (keys.down) velocity.vy = this.speed;
  }
}

