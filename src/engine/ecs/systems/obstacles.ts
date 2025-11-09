/**
 * Obstacle System - detects collisions with obstacles and drains fuel
 * Also handles boundary wrapping for moving obstacles
 * 
 * SOLID Principle: Single Responsibility - Only handles obstacle collisions and movement
 * DRY Principle: Uses shared collision utility instead of duplicating AABB logic
 */
import type { World } from '../world.js';
import type { System } from '../types.js';
import type { Position } from '../components/position.js';
import type { Fuel } from '../components/fuel.js';
import type { Velocity } from '../components/velocity.js';
import { createShipBoundingBox, checkShipAsteroidCollision } from '../../utils/collision.js';
import { CONFIG } from '../../../config.js';

export interface Obstacle {
  id: string;
  entityId: number; // ECS entity ID
  width: number;
  height: number;
  fuelDrain: number; // Amount of fuel to drain per collision
  offsetX?: number; // X offset for hitbox (to account for image borders)
  offsetY?: number; // Y offset for hitbox (to account for image borders)
}

export class ObstaclesSystem implements System {
  private obstacles: Map<string, Obstacle> = new Map(); // id -> Obstacle
  private collisionCooldown = new Map<number, number>(); // entityId -> last collision time
  private readonly COOLDOWN_MS = 500; // Prevent multiple collisions in quick succession
  private stageWidth: number = 0;
  private stageHeight: number = 0;
  private onKnockbackCallback: (() => void) | null = null; // Callback when knockback occurs

  /**
   * Set stage dimensions for boundary wrapping
   */
  setStageDimensions(width: number, height: number): void {
    this.stageWidth = width;
    this.stageHeight = height;
  }

  addObstacle(obstacle: Obstacle): void {
    this.obstacles.set(obstacle.id, obstacle);
  }

  removeObstacle(id: string): void {
    this.obstacles.delete(id);
  }

  /**
   * Get obstacle by ID
   */
  getObstacle(id: string): Obstacle | undefined {
    return this.obstacles.get(id);
  }

  /**
   * Set callback to be called when knockback occurs
   */
  setOnKnockbackCallback(callback: (() => void) | null): void {
    this.onKnockbackCallback = callback;
  }

  update(_dt: number, world: World): void {
    // Update obstacle positions and handle boundary wrapping
    for (const obstacle of this.obstacles.values()) {
      const position = world.getComponent<Position>(obstacle.entityId, 'position');
      const velocity = world.getComponent<Velocity>(obstacle.entityId, 'velocity');
      
      if (position && velocity && this.stageWidth > 0 && this.stageHeight > 0) {
        // Wrap around screen boundaries
        if (position.x + obstacle.width < 0) {
          position.x = this.stageWidth;
        } else if (position.x > this.stageWidth) {
          position.x = -obstacle.width;
        }
        
        if (position.y + obstacle.height < 0) {
          position.y = this.stageHeight;
        } else if (position.y > this.stageHeight) {
          position.y = -obstacle.height;
        }
      }
    }

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
      for (const obstacle of this.obstacles.values()) {
        const obstaclePos = world.getComponent<Position>(obstacle.entityId, 'position');
        if (!obstaclePos) continue;

        // Apply offset if present (to account for image borders)
        const hitboxX = obstaclePos.x + (obstacle.offsetX || 0);
        const hitboxY = obstaclePos.y + (obstacle.offsetY || 0);

        // Use circular collision for asteroids (more accurate for round objects)
        // Calculate asteroid center and radius
        const asteroidCenterX = hitboxX + obstacle.width / 2;
        const asteroidCenterY = hitboxY + obstacle.height / 2;
        const asteroidRadius = Math.min(obstacle.width, obstacle.height) / 2; // Use smaller dimension for radius
        
        // Check collision using hybrid approach: ship (box) vs asteroid (circle)
        const shipBox = createShipBoundingBox(position.x, position.y);
        
        // Detailed debug logging to diagnose collision mismatch
        if (CONFIG.DEBUG_HITBOX) {
          const shipCenterX = shipBox.x + shipBox.width / 2;
          const shipCenterY = shipBox.y + shipBox.height / 2;
          const distance = Math.sqrt(
            Math.pow(asteroidCenterX - shipCenterX, 2) + 
            Math.pow(asteroidCenterY - shipCenterY, 2)
          );
          
          console.log('Collision check:', {
            shipEntityPos: { x: position.x, y: position.y },
            shipBox: { 
              x: shipBox.x, 
              y: shipBox.y, 
              w: shipBox.width, 
              h: shipBox.height,
              centerX: shipCenterX,
              centerY: shipCenterY
            },
            asteroid: { 
              entityPos: { x: obstaclePos.x, y: obstaclePos.y },
              hitboxOffset: { x: obstacle.offsetX || 0, y: obstacle.offsetY || 0 },
              hitboxSize: { w: obstacle.width, h: obstacle.height },
              centerX: asteroidCenterX, 
              centerY: asteroidCenterY, 
              radius: asteroidRadius 
            },
            distance: distance,
            radius: asteroidRadius,
            wouldCollide: distance < asteroidRadius,
            obstacleId: obstacle.id
          });
        }
        
        if (checkShipAsteroidCollision(shipBox, asteroidCenterX, asteroidCenterY, asteroidRadius)) {
          // Collision detected - drain fuel
          
          // Drain fuel
          fuel.current = Math.max(0, fuel.current - obstacle.fuelDrain);
          this.collisionCooldown.set(shipId, now);
          
          // Apply knockback - push ship away from asteroid directly on position
          // This ensures knockback works even if velocity gets reset by player input
          const shipPosition = world.getComponent<Position>(shipId, 'position');
          if (shipPosition) {
            // Calculate ship center
            const shipCenterX = shipBox.x + shipBox.width / 2;
            const shipCenterY = shipBox.y + shipBox.height / 2;
            
            // Calculate direction from asteroid to ship (push ship away)
            const dx = shipCenterX - asteroidCenterX;
            const dy = shipCenterY - asteroidCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              // Normalize direction
              const dirX = dx / distance;
              const dirY = dy / distance;
              
              // Apply knockback directly to position (in pixels)
              // Use a fixed distance for immediate visual feedback (about 10-15 pixels)
              const knockbackDistance = 15; // Pixels to push ship away immediately
              
              shipPosition.x += dirX * knockbackDistance;
              shipPosition.y += dirY * knockbackDistance;
              
              // Clear velocity to stop movement immediately (movement will be disabled)
              const velocity = world.getComponent<Velocity>(shipId, 'velocity');
              if (velocity) {
                velocity.vx = 0;
                velocity.vy = 0;
              }
              
              // Notify that knockback occurred (for disabling movement)
              if (this.onKnockbackCallback) {
                this.onKnockbackCallback();
              }
            }
          }
          
          // Emit event for feedback
          // You can add visual feedback here if needed
          break; // Only one collision per frame
        }
      }
    }
  }
}

