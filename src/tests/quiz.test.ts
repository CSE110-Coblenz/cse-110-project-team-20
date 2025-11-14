import { describe, it, expect, beforeEach, vi} from 'vitest';
import { QuizUI } from '../ui/quiz';
import { World } from '../engine/ecs/world.js';
import { createEventBus } from '../engine/events.js';

describe('QuizUI', () => {
    let world: World;
    let quizUI: QuizUI;
    let eventBus: ReturnType<typeof createEventBus>;
    
    beforeEach(() => {
        world = new World();
        eventBus = createEventBus();
        quizUI = new QuizUI(eventBus);
    });

    //TODO: Add tests for QuizUI functionality
});