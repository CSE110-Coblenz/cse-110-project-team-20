/**
 * Typed event topic constants to prevent string typos
 */
export const EventTopics = {
  QUIZ_PASSED: 'quiz:passed',
  QUIZ_FAILED: 'quiz:failed',
  CUTSCENE_START: 'cutscene:start',
  CUTSCENE_END: 'cutscene:end',
  FUEL_EMPTY: 'fuel:empty',
  FUEL_REFUELED: 'fuel:refueled',
  SAVE_UPDATED: 'save:updated',
  SCENE_TRANSITION: 'scene:transition',
} as const;

export type EventTopic = typeof EventTopics[keyof typeof EventTopics];

