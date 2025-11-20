/**
 * SaveRepository - versioned localStorage persistence
 */
import type { EventBus } from '../engine/events.js';
import { EventTopics } from '../engine/events/topics.js';

export interface SaveData {
  version: string;
  playerName?: string;
  tutorialDone?: boolean;
  explorationUnlocked?: boolean;
  quizResults?: Record<string, boolean>;
}

const CURRENT_VERSION = 'mvp-1';
const STORAGE_KEY = 'space-game-save';

export class SaveRepository {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  get(): SaveData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { version: CURRENT_VERSION };
      }

      const data = JSON.parse(stored) as SaveData;

      // Version migration logic here if needed
      if (data.version !== CURRENT_VERSION) {
        // For MVP, just reset
        return { version: CURRENT_VERSION };
      }

      return data;
    } catch (error) {
      return { version: CURRENT_VERSION };
    }
  }

  set(data: Partial<SaveData>): void {
    const current = this.get();
    const updated: SaveData = {
      ...current,
      ...data,
      version: CURRENT_VERSION,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.eventBus.emit(EventTopics.SAVE_UPDATED);
    } catch (error) {
      // Failed to save data
    }
  }

  merge(data: Partial<SaveData>): void {
    const current = this.get();
    this.set({ ...current, ...data });
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.eventBus.emit(EventTopics.SAVE_UPDATED);
    } catch (error) {
      // Failed to clear save data
    }
  }

  getPlayerName(): string | undefined {
    return this.get().playerName;
  }

  setPlayerName(name: string): void {
    this.merge({ playerName: name });
  }

  isTutorialDone(): boolean {
    return this.get().tutorialDone ?? false;
  }

  setTutorialDone(done: boolean): void {
    this.merge({ tutorialDone: done });
  }

  isExplorationUnlocked(): boolean {
    return this.get().explorationUnlocked ?? false;
  }

  setExplorationUnlocked(unlocked: boolean): void {
    this.merge({ explorationUnlocked: unlocked });
  }

  setQuizResult(quizId: string, passed: boolean): void {
    const current = this.get();
    const quizResults = current.quizResults || {};
    quizResults[quizId] = passed;
    this.merge({ quizResults });
  }
}

