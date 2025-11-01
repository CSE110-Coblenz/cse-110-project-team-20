/**
 * EventBus using mitt for pub/sub
 */
import mitt, { type Emitter } from 'mitt';

type GameEvents = {
  'quiz:passed': { quizId: string };
  'quiz:failed': { quizId: string };
  'cutscene:start': { cutsceneId: string };
  'cutscene:end': { cutsceneId: string };
  'fuel:empty': void;
  'fuel:refueled': { amount: number };
  'save:updated': void;
  'scene:transition': { to: string };
};

export type EventBus = Emitter<GameEvents>;

export function createEventBus(): EventBus {
  return mitt<GameEvents>();
}

