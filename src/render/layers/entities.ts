/**
 * Entities layer - renders game entities from ECS world
 */
import Konva from 'konva';
import type { World } from '../../engine/ecs/world.js';
import type { Sprite } from '../../engine/ecs/components/sprite.js';
import type { Position } from '../../engine/ecs/components/position.js';

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

      // Skip refuel-station entities - they're rendered as images (ISS) instead of rectangles
      if (sprite.key === 'refuel-station') continue;

      // Create Konva node - use image for ship, rectangle for others
      let node: Konva.Rect | Konva.Image;
      
      if (sprite.key === 'ship') {
        // Load ship image
        const shipImage = this.imageCache.get('ship');
        if (shipImage) {
          node = new Konva.Image({
            x: position.x,
            y: position.y,
            image: shipImage,
            width: 50,
            height: 50,
            rotation: position.angle || 0,
            offsetX: 25, // Center rotation point
            offsetY: 25,
          });
        } else {
          // Fallback to rectangle if image not loaded yet
          node = new Konva.Rect({
            x: position.x,
            y: position.y,
            width: 50,
            height: 50,
            fill: '#4a9eff',
            rotation: position.angle || 0,
            offsetX: 25,
            offsetY: 25,
          });
        }
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
        // For Rect nodes, use setAttrs
        drawable.node.setAttrs({
          x: position.x,
          y: position.y,
          rotation: position.angle || 0,
        });
      }
    }
  }

  render(): void {
    this.updateEntities();
    // Batch draw handled by stage
  }
}

