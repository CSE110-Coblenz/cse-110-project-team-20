/**
 * SaveRepository tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveRepository } from '../persistence/SaveRepository.js';
import { createEventBus } from '../engine/events.js';

describe('SaveRepository', () => {
  let saveRepository: SaveRepository;
  let eventBus: ReturnType<typeof createEventBus>;

  beforeEach(() => {
    localStorage.clear();
    eventBus = createEventBus();
    saveRepository = new SaveRepository(eventBus);
  });

  it('should create default save data on first get', () => {
    const data = saveRepository.get();
    expect(data.version).toBe('mvp-1');
    expect(data.playerName).toBeUndefined();
  });

  it('should save and retrieve player name', () => {
    saveRepository.setPlayerName('TestPlayer');
    expect(saveRepository.getPlayerName()).toBe('TestPlayer');
  });

  it('should merge data correctly', () => {
    saveRepository.set({ playerName: 'Player1' });
    saveRepository.merge({ tutorialDone: true });
    
    const data = saveRepository.get();
    expect(data.playerName).toBe('Player1');
    expect(data.tutorialDone).toBe(true);
  });

  it('should emit save:updated event on set', () => {
    const handler = vi.fn();
    eventBus.on('save:updated', handler);
    
    saveRepository.set({ playerName: 'Test' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should clear save data', () => {
    saveRepository.set({ playerName: 'Test' });
    saveRepository.clear();
    
    const data = saveRepository.get();
    expect(data.playerName).toBeUndefined();
  });

  it('should handle quiz results', () => {
    saveRepository.setQuizResult('quiz-1', true);
    saveRepository.setQuizResult('quiz-2', false);
    
    const data = saveRepository.get();
    expect(data.quizResults?.['quiz-1']).toBe(true);
    expect(data.quizResults?.['quiz-2']).toBe(false);
  });

  it('should set tutorial and exploration flags', () => {
    saveRepository.setTutorialDone(true);
    saveRepository.setExplorationUnlocked(true);
    
    expect(saveRepository.isTutorialDone()).toBe(true);
    expect(saveRepository.isExplorationUnlocked()).toBe(true);
  });
});

