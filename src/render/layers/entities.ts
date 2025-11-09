/**
 * Entities layer - renders game entities from ECS world
 * 
 * SOLID Principle: Single Responsibility - Only handles entity rendering
 * DRY Principle: Uses config constants for ship dimensions
 */
import Konva from 'konva';
import type { World } from '../../engine/ecs/world.js';
import type { Sprite } from '../../engine/ecs/components/sprite.js';
import type { Position } from '../../engine/ecs/components/position.js';
import { CONFIG } from '../../config.js';

interface DrawableEntity {
  id: number;
  node: Konva.Rect | Konva.Image;
}

export class EntitiesLayer {
  private layer: Konva.Layer;
  private world: World;
  private entities = new Map<number, DrawableEntity>();
  private imageCache = new Map<string, HTMLImageElement>(); // Cache loaded images

  constructor(layer: Konva.Layer, world: World) {
    this.layer = layer;
    this.world = world;
    this.preloadImages();
  }

  /**
   * Preload common sprite images
   */
  private preloadImages(): void {
    const shipImg = new Image();
    shipImg.src = '/ship.png';
    shipImg.onload = () => {
      this.imageCache.set('ship', shipImg);
    };
    this.imageCache.set('ship', shipImg); // Set immediately for synchronous access
  }

  /**
   * Initialize entity nodes (called on scene init)
   */
  syncEntities(): void {
    this.entities.clear();
    this.layer.destroyChildren();

    // Get all entities with Sprite and Position
    const entities = this.world.getEntitiesWith(['sprite', 'position']);

    for (const entityId of entities) {
      const sprite = this.world.getComponent<Sprite>(entityId, 'sprite');
      const position = this.world.getComponent<Position>(entityId, 'position');

      if (!sprite || !position) continue;

      // Skip refuel-station and asteroid entities - they're rendered as images instead of rectangles
      if (sprite.key === 'refuel-station' || sprite.key === 'asteroid') continue;

      // Create Konva node - use image for ship, rectangle for others
      let node: Konva.Rect | Konva.Image;
      
      if (sprite.key === 'ship') {
        // Use simple rectangle placeholder for ship hitbox visualization
        // This matches the exact collision detection area (50x50)
        // REMOVED offsetX/offsetY to match collision detection exactly
        node = new Konva.Rect({
          x: position.x,
          y: position.y,
          width: CONFIG.SHIP_WIDTH,
          height: CONFIG.SHIP_HEIGHT,
          fill: '#4a9eff',
          stroke: '#2a7eef',
          strokeWidth: 2,
          opacity: 0.9,
          rotation: position.angle || 0,
          // No offset - position is top-left corner, matches collision detection
        });
      } else {
        // Default rectangle for other entities
        node = new Konva.Rect({
          x: position.x,
          y: position.y,
          width: 40,
          height: 40,
          fill: '#ffaa00',
          rotation: position.angle || 0,
        });
      }

      this.layer.add(node);
      this.entities.set(entityId, { id: entityId, node });
    }
  }

  /**
   * Update entity positions (called every frame)
   */
  updateEntities(): void {
    for (const [entityId, drawable] of this.entities.entries()) {
      const position = this.world.getComponent<Position>(entityId, 'position');
      if (!position) continue;

      // Update node attributes (no new objects allocated)
      // For Konva.Image, we can't use setAttrs with full config, so update individually
      if (drawable.node instanceof Konva.Image) {
        drawable.node.x(position.x);
        drawable.node.y(position.y);
        drawable.node.rotation(position.angle || 0);
      } else {
        // For Rect nodes (ship), position is top-left corner
        // This MUST match collision detection which uses position.x, position.y as top-left
        drawable.node.setAttrs({
          x: position.x,
          y: position.y,
          rotation: position.angle || 0,
        });
        
        // Debug: Log ship visual position to compare with collision detection
        if (CONFIG.DEBUG_HITBOX && entityId === 1) { // Assuming ship is entity 1
          console.log('Visual ship position:', {
            entityId,
            entityPos: { x: position.x, y: position.y },
            visualRect: {
              x: drawable.node.x(),
              y: drawable.node.y(),
              w: drawable.node.width(),
              h: drawable.node.height()
            },
            // Collision uses: createShipBoundingBox(position.x, position.y)
            expectedCollisionBox: {
              x: position.x,
              y: position.y,
              w: CONFIG.SHIP_WIDTH,
              h: CONFIG.SHIP_HEIGHT
            }
          });
        }
      }
    }
  }

  render(): void {
    this.updateEntities();
    // Batch draw handled by stage
  }
}

