/**
 * Scene Manager - handles scene lifecycle and transitions
 */
import type { EventBus } from './events.js';

export interface Scene {
  init(): void;
  update(dt: number): void;
  render(): void;
  dispose(): void;
}

export class SceneManager {
  private currentScene: Scene | null = null;
  private sceneMap = new Map<string, () => Scene>();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  register(name: string, factory: () => Scene): void {
    this.sceneMap.set(name, factory);
  }

  transitionTo(name: string): void {
    const factory = this.sceneMap.get(name);
    if (!factory) {
      console.error(`Scene "${name}" not found`);
      return;
    }

    if (this.currentScene) {
      this.currentScene.dispose();
    }

    this.currentScene = factory();
    this.currentScene.init();
    this.eventBus.emit('scene:transition', { to: name });
  }

  update(dt: number): void {
    if (this.currentScene) {
      this.currentScene.update(dt);
    }
  }

  render(): void {
    if (this.currentScene) {
      this.currentScene.render();
    }
  }
}

