/**
 * Collision detection utilities
 *
 * SOLID Principle: Single Responsibility - Only handles collision detection logic
 * DRY Principle: Reusable AABB collision function to avoid duplication
 *
 * This utility extracts the collision detection logic that was duplicated
 * in TriggersSystem and ObstaclesSystem, following the DRY principle.
 */

import { CONFIG } from '../../config.js';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Axis-Aligned Bounding Box (AABB) collision detection
 *
 * Checks if two rectangular bounding boxes intersect.
 * Used by both trigger and obstacle collision systems.
 *
 * @param box1 First bounding box (typically the ship)
 * @param box2 Second bounding box (trigger or obstacle)
 * @returns true if boxes intersect, false otherwise
 */
export function checkAABBCollision(
  box1: BoundingBox,
  box2: BoundingBox
): boolean {
  return (
    box1.x < box2.x + box2.width &&
    box1.x + box1.width > box2.x &&
    box1.y < box2.y + box2.height &&
    box1.y + box1.height > box2.y
  );
}

/**
 * Create ship bounding box from position
 *
 * DRY Principle: Centralizes ship dimension logic
 *
 * @param x Ship X position (top-left corner)
 * @param y Ship Y position (top-left corner)
 * @returns Bounding box for the ship
 */
export function createShipBoundingBox(x: number, y: number): BoundingBox {
  return {
    x,
    y,
    width: CONFIG.SHIP_WIDTH,
    height: CONFIG.SHIP_HEIGHT,
  };
}

/**
 * Circular collision detection (better for round objects like asteroids)
 *
 * More accurate than AABB for circular/round objects.
 * Uses distance between centers to check collision.
 *
 * @param x1 Center X of first circle (ship)
 * @param y1 Center Y of first circle (ship)
 * @param radius1 Radius of first circle (ship)
 * @param x2 Center X of second circle (asteroid)
 * @param y2 Center Y of second circle (asteroid)
 * @param radius2 Radius of second circle (asteroid)
 * @returns true if circles intersect, false otherwise
 */
export function checkCircleCollision(
  x1: number,
  y1: number,
  radius1: number,
  x2: number,
  y2: number,
  radius2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < radius1 + radius2;
}

/**
 * Check collision between ship (circle) and asteroid (circle)
 *
 * Simplified: Both use circles for accurate center-to-center collision
 * Ship is treated as a circle with radius = half of its larger dimension
 *
 * @param shipBox Ship bounding box (used to calculate center)
 * @param asteroidCenterX Asteroid center X
 * @param asteroidCenterY Asteroid center Y
 * @param asteroidRadius Asteroid radius
 * @returns true if ship and asteroid collide
 */
export function checkShipAsteroidCollision(
  shipBox: BoundingBox,
  asteroidCenterX: number,
  asteroidCenterY: number,
  asteroidRadius: number
): boolean {
  // Calculate ship center
  const shipCenterX = shipBox.x + shipBox.width / 2;
  const shipCenterY = shipBox.y + shipBox.height / 2;

  // Calculate ship radius (use larger dimension for circle)
  const shipRadius = Math.max(shipBox.width, shipBox.height) / 2;

  // Calculate distance between centers
  const dx = asteroidCenterX - shipCenterX;
  const dy = asteroidCenterY - shipCenterY;
  const distanceSquared = dx * dx + dy * dy;

  // Check if distance is less than sum of radii (collision)
  const combinedRadius = asteroidRadius + shipRadius;
  return distanceSquared < combinedRadius * combinedRadius;
}
