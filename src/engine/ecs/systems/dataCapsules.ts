/**
 * DataCapsulesSystem - handles collectible lunar intel capsules.
 *
 * Responsibilities:
 * - Detect collision between the player's ship and capsule hitboxes
 * - Randomly pick a fact from the capsule and emit collection events
 * - Track progress (X/Y capsules collected) for HUD/UI consumption
 */
import type { System } from '../types.js';
import type { World } from '../world.js';
import type { Position } from '../components/position.js';
import type { DataCapsule, CapsuleFact } from '../components/dataCapsule.js';
import type { EventBus } from '../../events.js';
import { EventTopics } from '../../events/topics.js';
import {
  checkAABBCollision,
  createShipBoundingBox,
} from '../../utils/collision.js';

interface CapsuleRegistration {
  id: string;
  entityId: number;
  width: number;
  height: number;
  onCollected?: () => void;
}

interface CapsuleState extends CapsuleRegistration {
  collected: boolean;
}

export class DataCapsulesSystem implements System {
  private readonly eventBus: EventBus;
  private capsules = new Map<string, CapsuleState>();
  private collectedCapsules = new Set<string>();
  private collectedFacts: CapsuleFact[] = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Register a capsule trigger area. Called by the scene during setup.
   */
  addCapsule(registration: CapsuleRegistration): void {
    this.capsules.set(registration.id, {
      ...registration,
      collected: false,
    });
  }

  /**
   * Remove all capsule state (used when disposing the scene).
   */
  clear(): void {
    this.capsules.clear();
    this.collectedCapsules.clear();
    this.collectedFacts = [];
  }

  /**
   * Get collected facts (used to build quiz content).
   */
  getCollectedFacts(): CapsuleFact[] {
    return [...this.collectedFacts];
  }

  getCollectedCount(): number {
    return this.collectedCapsules.size;
  }

  getTotalCapsules(): number {
    return this.capsules.size;
  }

  update(_dt: number, world: World): void {
    if (this.capsules.size === 0) return;
    if (this.collectedCapsules.size === this.capsules.size) return;

    const ships = world.getEntitiesWith(['position', 'sprite', 'fuel']);
    if (ships.length === 0) return;

    for (const shipId of ships) {
      const position = world.getComponent<Position>(shipId, 'position');
      if (!position) continue;

      const shipBox = createShipBoundingBox(position.x, position.y);

      for (const capsule of this.capsules.values()) {
        if (capsule.collected) continue;

        const capsulePosition = world.getComponent<Position>(
          capsule.entityId,
          'position'
        );
        if (!capsulePosition) continue;

        const capsuleBox = {
          x: capsulePosition.x,
          y: capsulePosition.y,
          width: capsule.width,
          height: capsule.height,
        };

        if (checkAABBCollision(shipBox, capsuleBox)) {
          this.collectCapsule(capsule, world);
          // Only allow one capsule per frame to be collected
          // to avoid collecting overlapping capsules simultaneously.
          return;
        }
      }
    }
  }

  private collectCapsule(capsule: CapsuleState, world: World): void {
    const capsuleComponent = world.getComponent<DataCapsule>(
      capsule.entityId,
      'data-capsule'
    );

    if (!capsuleComponent || capsuleComponent.facts.length === 0) {
      capsule.collected = true;
      return;
    }

    const fact =
      capsuleComponent.facts[
        Math.floor(Math.random() * capsuleComponent.facts.length)
      ];

    capsule.collected = true;
    this.collectedCapsules.add(capsule.id);
    this.collectedFacts.push(fact);

    // Remove entity so it no longer renders or collides
    world.removeEntity(capsule.entityId);
    capsule.onCollected?.();

    this.eventBus.emit(EventTopics.DATA_CAPSULE_COLLECTED, {
      capsuleId: capsule.id,
      fact,
      collectedCount: this.collectedCapsules.size,
      totalCapsules: this.capsules.size,
    });

    if (this.collectedCapsules.size === this.capsules.size) {
      this.eventBus.emit(EventTopics.DATA_CAPSULES_COMPLETE, {
        facts: [...this.collectedFacts],
      });
    }
  }
}

export type { CapsuleRegistration as DataCapsuleRegistration };

