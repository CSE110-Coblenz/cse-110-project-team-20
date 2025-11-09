/**
 * EventBus using mitt for pub/sub
 */
import mitt, { type Emitter } from 'mitt';
import { EventTopics } from './events/topics.js';

type GameEvents = {
  [EventTopics.QUIZ_PASSED]: { quizId: string };
  [EventTopics.QUIZ_FAILED]: { quizId: string };
  [EventTopics.CUTSCENE_START]: { cutsceneId: string };
  [EventTopics.CUTSCENE_END]: { cutsceneId: string };
  [EventTopics.FUEL_EMPTY]: void;
  [EventTopics.FUEL_REFUELED]: { amount: number };
  [EventTopics.SAVE_UPDATED]: void;
  [EventTopics.SCENE_TRANSITION]: { to: string };
  'minigame:passed' : {minigameId: string}
  'minigame:failed' : {minigameId: string}
};

export type EventBus = Emitter<GameEvents>;

export function createEventBus(): EventBus {
  return mitt<GameEvents>();

  
}

// Re-export topics for convenience
export { EventTopics } from './events/topics.js';

