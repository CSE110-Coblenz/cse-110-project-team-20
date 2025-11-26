import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PasswordCracker,
  type PasswordCrackerOptions,
} from '../ui/passwordCracker.js';
import { createEventBus } from '../engine/events.js';

type PasswordCrackerTestHarness = PasswordCracker & {
  handleSubmit: () => void;
  extractPassword: (paragraph: string) => string;
  options: PasswordCrackerOptions | null;
  currentTarget: string;
  inputElement: HTMLInputElement | null;
};

const getHarness = (instance: PasswordCracker): PasswordCrackerTestHarness =>
  instance as unknown as PasswordCrackerTestHarness;

describe('PasswordCracker', () => {
  let passwordCracker: PasswordCracker;
  let eventBus: ReturnType<typeof createEventBus>;

  beforeEach(() => {
    eventBus = createEventBus();
    passwordCracker = new PasswordCracker(eventBus);
  });

  it('should register WASD key inputs for password entry', () => {
    // because we don't want WASD to move the spaceship instead of typing password
    const submitSpy = vi.spyOn(getHarness(passwordCracker), 'handleSubmit');
    passwordCracker.show({
      id: 'test-cracker',
      title: 'Test Password Cracker',
      puzzleSetKey: 'iss',
    });

    const input = document.getElementById('password-input') as HTMLInputElement;

    // simulate WASD
    const wEvent = new KeyboardEvent('keypress', {
      key: 'W',
      bubbles: true,
    });

    const aEvent = new KeyboardEvent('keypress', {
      key: 'A',
      bubbles: true,
    });

    const sEvent = new KeyboardEvent('keypress', {
      key: 'S',
      bubbles: true,
    });

    const dEvent = new KeyboardEvent('keypress', {
      key: 'D',
      bubbles: true,
    });

    input.dispatchEvent(wEvent);
    input.dispatchEvent(aEvent);
    input.dispatchEvent(sEvent);
    input.dispatchEvent(dEvent);

    expect(submitSpy).not.toHaveBeenCalledTimes(4);
  });

  it('should extract password correctly from text', () => {
    const samplePuzzle = 'SPACE is huge. STARS shine BRIGHTLY.';
    const extractedPassword =
      getHarness(passwordCracker).extractPassword(samplePuzzle);
    expect(extractedPassword).toBe('SPACESTARSBRIGHTLY');
  });

  it('should pass minigame when correct password', () => {
    const eventSpy = vi.spyOn(eventBus, 'emit');

    const harness = getHarness(passwordCracker);
    harness.options = {
      id: 'test-pass',
      title: 'Test',
      puzzleSetKey: 'iss',
    };
    harness.currentTarget = 'TESTPASS';

    const input = document.createElement('input');
    input.value = 'TESTPASS';
    harness.inputElement = input;
    harness.handleSubmit();

    expect(eventSpy).toHaveBeenCalledWith('minigame:passed', {
      minigameId: 'test-pass',
    });
  });

  it('should fail minigame when incorrect password', () => {
    const eventSpy = vi.spyOn(eventBus, 'emit');

    const harness = getHarness(passwordCracker);
    harness.options = {
      id: 'test-fail',
      title: 'Test',
      puzzleSetKey: 'iss',
    };
    harness.currentTarget = 'TESTPASS';

    const input = document.createElement('input');
    input.value = 'TESTFAIL';
    harness.inputElement = input;
    harness.handleSubmit();

    expect(eventSpy).toHaveBeenCalledWith('minigame:failed', {
      minigameId: 'test-fail',
    });
  });

  it('should uppercase user input automatically', () => {
    const eventSpy = vi.spyOn(eventBus, 'emit');

    const harness = getHarness(passwordCracker);
    harness.options = {
      id: 'test-pass',
      title: 'Test',
      puzzleSetKey: 'iss',
    };
    harness.currentTarget = 'TESTPASS';

    const input = document.createElement('input');
    input.value = 'testpass';
    harness.inputElement = input;
    harness.handleSubmit();

    expect(eventSpy).toHaveBeenCalledWith('minigame:passed', {
      minigameId: 'test-pass',
    });
  });
});
