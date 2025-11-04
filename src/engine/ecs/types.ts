/**
 * ECS-lite type definitions
 */

export type EntityId = number;

export type ComponentType = string;

export interface Component {
  type: ComponentType;
}

export interface System {
  update(dt: number, world: World): void;
}

// Forward declare World to avoid circular dependency
export interface World {
  createEntity(): EntityId;
  addComponent<T extends Component>(entityId: EntityId, component: T): void;
  removeComponent(entityId: EntityId, componentType: ComponentType): void;
  getComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType
  ): T | undefined;
  hasComponent(entityId: EntityId, componentType: ComponentType): boolean;
  getEntitiesWith(componentTypes: ComponentType[]): EntityId[];
  forEachEntity(
    componentTypes: ComponentType[],
    callback: (entityId: EntityId) => void
  ): void;
  removeEntity(entityId: EntityId): void;
}

