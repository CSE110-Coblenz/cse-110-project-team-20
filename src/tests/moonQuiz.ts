import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuizUI } from "../ui/quiz.js";
import { createEventBus } from '../engine/events.js';
import { EventTopics } from '../engine/events/topics.js';
import quizzes from "../data/quizzes.json";

// Ensure a clean DOM before each test
beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers(); // Use fake timers because QuizUI auto-advances after 500ms
});

// Moon-quiz computes correct and inccorect answers, where incorrect leads to retry
describe("Moon quiz scoring and retry", () => {
    // Moon-quiz computes correct answers
    it('should emit quiz:passed when all correct answers are chosen', () => {
        const eventBus = createEventBus();
        const spyPassed = vi.fn(); // mock function created by Vitest that lets us observe whether an event was emitted
        eventBus.on(EventTopics.QUIZ_PASSED, spyPassed); // listen for the quiz:passed event

        const quizUI = new QuizUI(eventBus);
        const moonQuiz = quizzes['moon-quiz'];
        quizUI.showQuiz(moonQuiz);

        // Simulate selecting all correct answers
        for (let i = 0; i < moonQuiz.questions.length; i++) {
            const { correct } = moonQuiz.questions[i];

            const options = document.querySelectorAll('.quiz-option');
            expect(options.length).toBeGreaterThan(0);
        
            (options[correct] as HTMLButtonElement).click();
            vi.advanceTimersByTime(500); // Advance timers to allow auto-advance to next question
        }

        // QuizUI should show results
        const results = document.body.innerHTML
        expect(results).toContain("You got 3 out of 3 correct");

        // Verify that the quiz:passed event was emitted
        expect(spyPassed).toHaveBeenCalled();
    })

    // Moon-quiz computes incorrect answers and leads to retry
    /** it('should emit quiz:failed when incorrect answers are chosen', () => { 
        const eventBus = createEventBus();
        const spyFailed = vi.fn();
        eventBus.on(EventTopics.QUIZ_FAILED, spyFailed);

        const quizUI = new QuizUI(eventBus);
        const moonQuiz = quizzes['moon-quiz'];
        quizUI.showQuiz(moonQuiz);
    });
    */
});



// Retry resets state




