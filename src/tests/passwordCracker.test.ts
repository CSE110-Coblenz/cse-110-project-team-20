import { describe, it, expect, beforeEach, vi} from 'vitest';
import { PasswordCracker } from '../ui/passwordCracker.js';
import { World } from '../engine/ecs/world.js';
import { createEventBus } from '../engine/events.js';

describe('PasswordCracker', () => {
    let world: World;
    let passwordCracker: PasswordCracker;
    let eventBus: ReturnType<typeof createEventBus>;
    
    beforeEach(() => {
        world = new World();
        eventBus = createEventBus();
        passwordCracker = new PasswordCracker(eventBus);
    });

    it('should register WASD key inputs for password entry', () => {
        // because we don't want WASD to move the spaceship instead of typing password
        const submitSpy = vi.spyOn(passwordCracker as any, 'handleSubmit');
        passwordCracker.show({
            id: 'test-cracker',
            title: 'Test Password Cracker',
            puzzleSetKey: 'iss'
        });

        const input = document.getElementById('password-input') as HTMLInputElement;

        // simulate WASD
        const wEvent = new KeyboardEvent('keypress', {
            key: 'W',
            bubbles: true
        });

        const aEvent = new KeyboardEvent('keypress', {
            key: 'A',
            bubbles: true
        });

        const sEvent = new KeyboardEvent('keypress', {
            key: 'S',
            bubbles: true
        });

        const dEvent = new KeyboardEvent('keypress', {
            key: 'D',
            bubbles: true
        });
        
        input.dispatchEvent(wEvent);
        input.dispatchEvent(aEvent);
        input.dispatchEvent(sEvent);
        input.dispatchEvent(dEvent);

        expect(submitSpy).not.toHaveBeenCalledTimes(4);
        
    });

    it('should extract password correctly from text', () => {
        const samplePuzzle = "SPACE is huge. STARS shine BRIGHTLY.";
        const extractedPassword = (passwordCracker as any).extractPassword(samplePuzzle);
        expect(extractedPassword).toBe('SPACESTARSBRIGHTLY');
    });

    it('should pass minigame when correct password', () => {
        const eventSpy = vi.spyOn(eventBus, 'emit');

        (passwordCracker as any).options = { id: 'test-pass' };
        (passwordCracker as any).currentTarget = 'TESTPASS';

        const input = document.createElement('input');
        input.value = 'TESTPASS';
        (passwordCracker as any).inputElement = input;
        (passwordCracker as any).handleSubmit();
        
        expect(eventSpy).toHaveBeenCalledWith('minigame:passed', { minigameId: 'test-pass' });
    });

    it('should fail minigame when incorrect password', () => {
        const eventSpy = vi.spyOn(eventBus, 'emit');

        (passwordCracker as any).options = { id: 'test-fail' };
        (passwordCracker as any).currentTarget = 'TESTPASS';

        const input = document.createElement('input');
        input.value = 'TESTFAIL';
        (passwordCracker as any).inputElement = input;
        (passwordCracker as any).handleSubmit();
        
        expect(eventSpy).toHaveBeenCalledWith('minigame:failed', { minigameId: 'test-fail' });
    });

    it('should uppercase user input automatically', () => {
        const eventSpy = vi.spyOn(eventBus, 'emit');

        (passwordCracker as any).options = { id: 'test-pass' };
        (passwordCracker as any).currentTarget = 'TESTPASS';

        const input = document.createElement('input');
        input.value = 'testpass';
        (passwordCracker as any).inputElement = input;
        (passwordCracker as any).handleSubmit();
        
        expect(eventSpy).toHaveBeenCalledWith('minigame:passed', { minigameId: 'test-pass' });
    });
});
