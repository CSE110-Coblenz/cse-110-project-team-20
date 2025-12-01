/**
 * Game configuration constants
 *
 * SOLID Principle: Single Responsibility - All game constants in one place
 * DRY Principle: Centralize magic numbers to avoid duplication
 */
export const CONFIG = {
  // Stage dimensions
  STAGE_WIDTH: 1280,
  STAGE_HEIGHT: 720,

  // Game loop timing
  FIXED_TIMESTEP: 16.67, // ms (target 60 FPS)
  MAX_FRAME_TIME: 100, // ms (cap to prevent spiral of death)

  // Entity dimensions
  SHIP_WIDTH: 50,
  SHIP_HEIGHT: 50,
  SHIP_CENTER_OFFSET: 25, // Half of ship size for rotation center

  // Fuel system
  FUEL_MAX: 100,
  FUEL_INITIAL: 50, // Start at 50% to force learning refueling
  FUEL_DRAIN_PER_COLLISION: 15, // Fuel drained when hitting obstacle
  FUEL_REFUEL_AMOUNT: 100, // Full refuel at station

  // Asteroid collision settings
  ASTEROID_HITBOX_SHRINK: 0.75, // Hitbox is 75% of image size (accounts for black borders)
  // Lower = smaller hitbox (more forgiving), Higher = larger hitbox (more strict)
  // 0.75 means the hitbox is 75% of the image, leaving 12.5% border on each side
  // Adjust this value if collisions feel too early (lower) or too hard to trigger (raise)
  KNOCKBACK_FORCE: 300, // Pixels per second - how fast ship is pushed back on collision
} as const;
