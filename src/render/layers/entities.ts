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
  node: Konva.Rect | Konva.Image | Konva.Circle | Konva.Group;
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
    shipImg.onload = () => {
      this.imageCache.set('ship', shipImg);
      // Redraw entities if ship image loads after initial render
      // This ensures ship image appears in all scenes when it finishes loading
      this.syncEntities();
    };
    shipImg.onerror = () => {
      // Image failed to load - will use circle fallback
    };
    shipImg.src = '/ship.png';
    // Set immediately so we can check if it's loaded
    this.imageCache.set('ship', shipImg);
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
      if (sprite.key === 'refuel-station' || sprite.key === 'asteroid')
        continue;

      // Create Konva node - use group with circle for ship, rectangle for others
      let node: Konva.Rect | Konva.Image | Konva.Circle | Konva.Group;

      if (sprite.key === 'ship') {
        // Position component stores top-left corner
        // Collision detection uses center: (position.x + width/2, position.y + height/2)
        // Group position is at COLLISION CENTER (not top-left) to match collision detection
        const shipCenterX = position.x + CONFIG.SHIP_WIDTH / 2;
        const shipCenterY = position.y + CONFIG.SHIP_HEIGHT / 2;
        const shipRadius = Math.max(CONFIG.SHIP_WIDTH, CONFIG.SHIP_HEIGHT) / 2;

        // Create a group positioned at collision center
        // This ensures visual position matches collision position exactly
        const shipGroup = new Konva.Group({
          x: shipCenterX, // Center position (matches collision detection)
          y: shipCenterY,
          rotation: position.angle || 0,
          // No offsetX/offsetY - group position IS the center
        });

        // Create circle at group center (0, 0 relative to group)
        const collisionCircle = new Konva.Circle({
          x: 0, // Center of group
          y: 0,
          radius: shipRadius,
          fill: '#4a9eff',
          stroke: '#2a7eef',
          strokeWidth: 2,
          opacity: 0.9,
        });
        shipGroup.add(collisionCircle);

        // If image is loaded, make circle invisible and add image on top
        const shipImage = this.imageCache.get('ship');
        if (shipImage && shipImage.complete && shipImage.naturalWidth > 0) {
          // Hide the circle (collision still uses it, but visually invisible)
          collisionCircle.opacity(0);

          // Add image centered on group (which is at collision center)
          const shipImageNode = new Konva.Image({
            x: -CONFIG.SHIP_WIDTH / 2, // Top-left relative to center
            y: -CONFIG.SHIP_HEIGHT / 2,
            image: shipImage,
            width: CONFIG.SHIP_WIDTH,
            height: CONFIG.SHIP_HEIGHT,
            // No offsetX/offsetY - image is already centered, group rotation handles it
          });
          shipGroup.add(shipImageNode);
        }

        node = shipGroup;
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
      if (drawable.node instanceof Konva.Group) {
        // Ship is a group containing circle (collision) and optionally image (visual)
        // Group position is at COLLISION CENTER (matches collision detection)
        const shipCenterX = position.x + CONFIG.SHIP_WIDTH / 2;
        const shipCenterY = position.y + CONFIG.SHIP_HEIGHT / 2;
        drawable.node.x(shipCenterX);
        drawable.node.y(shipCenterY);
        drawable.node.rotation(position.angle || 0);

        // Update image if it finished loading after initial creation
        const shipImage = this.imageCache.get('ship');
        if (shipImage && shipImage.complete && shipImage.naturalWidth > 0) {
          const children = drawable.node.getChildren();
          const circle = children.find(
            (child) => child instanceof Konva.Circle
          ) as Konva.Circle | undefined;
          const imageNode = children.find(
            (child) => child instanceof Konva.Image
          ) as Konva.Image | undefined;

          // Make circle invisible if image is loaded
          if (circle && circle.opacity() > 0) {
            circle.opacity(0);
            circle.fill('transparent');
            circle.stroke('transparent');
          }

          // Add image if not already added
          if (!imageNode) {
            const shipCenterOffsetX = CONFIG.SHIP_WIDTH / 2;
            const shipCenterOffsetY = CONFIG.SHIP_HEIGHT / 2;
            const newImageNode = new Konva.Image({
              x: 0, // Top-left relative to group
              y: 0,
              image: shipImage,
              width: CONFIG.SHIP_WIDTH,
              height: CONFIG.SHIP_HEIGHT,
              offsetX: shipCenterOffsetX, // Image rotates around its center
              offsetY: shipCenterOffsetY,
              // No rotation - group rotation handles it
            });
            drawable.node.add(newImageNode);
          } else {
            // Don't set image rotation - group handles rotation
            // Just update image if it changed
            const currentImage = imageNode.image();
            if (!currentImage || currentImage !== shipImage) {
              imageNode.image(shipImage);
            }
          }
        }
      } else if (drawable.node instanceof Konva.Circle) {
        // Fallback: ship as circle only (no image loaded yet)
        // Position circle at center (for backwards compatibility)
        const shipCenterX = position.x + CONFIG.SHIP_WIDTH / 2;
        const shipCenterY = position.y + CONFIG.SHIP_HEIGHT / 2;
        drawable.node.x(shipCenterX);
        drawable.node.y(shipCenterY);
        drawable.node.rotation(position.angle || 0);
      } else if (drawable.node instanceof Konva.Rect) {
        // For Rect nodes, position is top-left corner
        drawable.node.setAttrs({
          x: position.x,
          y: position.y,
          rotation: position.angle || 0,
        });
      } else if (drawable.node instanceof Konva.Image) {
        // For Image nodes (other entities), update position
        drawable.node.x(position.x);
        drawable.node.y(position.y);
        drawable.node.rotation(position.angle || 0);
      }
    }
  }

  render(): void {
    this.updateEntities();
    // Batch draw handled by stage
  }
}
