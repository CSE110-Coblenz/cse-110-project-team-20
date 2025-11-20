/**
 * ECS-lite World - entity and component registry
 */
import type { EntityId, Component, ComponentType } from './types.js';

export class World {
  private nextEntityId = 1;
  private entities = new Set<EntityId>();
  private components = new Map<EntityId, Map<ComponentType, Component>>();
  private componentIndex = new Map<ComponentType, Set<EntityId>>();

  createEntity(): EntityId {
    const id = this.nextEntityId++;
    this.entities.add(id);
    this.components.set(id, new Map());
    return id;
  }

  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    if (!this.entities.has(entityId)) {
      return;
    }

    const entityComponents = this.components.get(entityId)!;
    const oldComponent = entityComponents.get(component.type);

    // Remove from old index if replacing
    if (oldComponent) {
      const index = this.componentIndex.get(component.type);
      index?.delete(entityId);
    }

    // Add component
    entityComponents.set(component.type, component);

    // Add to index
    let index = this.componentIndex.get(component.type);
    if (!index) {
      index = new Set();
      this.componentIndex.set(component.type, index);
    }
    index.add(entityId);
  }

  removeComponent(
    entityId: EntityId,
    componentType: ComponentType
  ): void {
    const entityComponents = this.components.get(entityId);
    if (!entityComponents) return;

    entityComponents.delete(componentType);

    // Remove from index
    const index = this.componentIndex.get(componentType);
    index?.delete(entityId);
  }

  getComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType
  ): T | undefined {
    const entityComponents = this.components.get(entityId);
    if (!entityComponents) return undefined;
    return entityComponents.get(componentType) as T | undefined;
  }

  hasComponent(entityId: EntityId, componentType: ComponentType): boolean {
    return this.getComponent(entityId, componentType) !== undefined;
  }

  getEntitiesWith(componentTypes: ComponentType[]): EntityId[] {
    if (componentTypes.length === 0) return Array.from(this.entities);

    // Start with entities that have the first component type
    const firstType = componentTypes[0];
    if (!firstType) return [];
    const firstIndex = this.componentIndex.get(firstType);
    if (!firstIndex || firstIndex.size === 0) return [];

    const result: EntityId[] = [];

    // For each entity in the first index, check if it has all required components
    for (const entityId of firstIndex) {
      let hasAll = true;
      for (let i = 1; i < componentTypes.length; i++) {
        const componentType = componentTypes[i];
        if (!componentType || !this.hasComponent(entityId, componentType)) {
          hasAll = false;
          break;
        }
      }
      if (hasAll) {
        result.push(entityId);
      }
    }

    return result;
  }

  forEachEntity(
    componentTypes: ComponentType[],
    callback: (entityId: EntityId) => void
  ): void {
    const entities = this.getEntitiesWith(componentTypes);
    for (const entityId of entities) {
      callback(entityId);
    }
  }

  removeEntity(entityId: EntityId): void {
    if (!this.entities.has(entityId)) return;

    // Remove from all component indices
    const entityComponents = this.components.get(entityId);
    if (entityComponents) {
      for (const componentType of entityComponents.keys()) {
        const index = this.componentIndex.get(componentType);
        index?.delete(entityId);
      }
    }

    this.components.delete(entityId);
    this.entities.delete(entityId);
  }
}

