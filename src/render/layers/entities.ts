/**
 * Entities layer - renders game entities from ECS world
 */
import Konva from 'konva';
import type { World } from '../../engine/ecs/world.js';
import type { Sprite } from '../../engine/ecs/components/sprite.js';
import type { Position } from '../../engine/ecs/components/position.js';

interface DrawableEntity {
  id: number;
  node: Konva.Rect;
}

export class EntitiesLayer {
  private layer: Konva.Layer;
  private world: World;
  private entities = new Map<number, DrawableEntity>();

  constructor(layer: Konva.Layer, world: World) {
    this.layer = layer;
    this.world = world;
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

      // Create Konva node (placeholder: rectangle)
      const node = new Konva.Rect({
        x: position.x,
        y: position.y,
        width: 40,
        height: 40,
        fill: sprite.key === 'ship' ? '#4a9eff' : '#ffaa00',
        rotation: position.angle || 0,
      });

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
      drawable.node.setAttrs({
        x: position.x,
        y: position.y,
        rotation: position.angle || 0,
      });
    }
  }

  render(): void {
    this.updateEntities();
    // Batch draw handled by stage
  }
}

