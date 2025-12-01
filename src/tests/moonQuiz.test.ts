import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuizUI } from "../ui/quiz.js";
import { createEventBus } from '../engine/events.js';
import { EventTopics } from '../engine/events/topics.js';
import quizzes from "../data/quizzes.json";

// Ensure a clean DOM before each test
beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers(); // Use fake timers because QuizUI auto-advances after 500ms
});

// Moon quiz computes correct and incorrect answers 
describe("Moon quiz answers and retry", () => {
    // Moon quiz computes correct answers
    it('should emit QUIZ_PASSED when all correct answers are chosen', () => {
        const eventBus = createEventBus();
        const spyPassed = vi.fn(); // mock function created by Vitest that lets us observe whether an event was emitted
        eventBus.on(EventTopics.QUIZ_PASSED, spyPassed); // listen for the QUIZ_PASSED event

        const quizUI = new QuizUI(eventBus);
        const moonQuiz = quizzes['moon-quiz'];
        quizUI.showQuiz(moonQuiz);

        // Simulate selecting all correct answers
        for (let i = 0; i < moonQuiz.questions.length; i++) {
            const { correct } = moonQuiz.questions[i];

            const options = document.querySelectorAll('.quiz-option');
            (options[correct] as HTMLButtonElement).click();

            vi.advanceTimersByTime(500); // advance timers to allow auto-advance to next question
        }

        // Continue button clicked
        const continueButton = document.querySelector('button');
        (continueButton as HTMLButtonElement).click();

        // Verify that the QUIZ_PASSED event was emitted
        expect(spyPassed).toHaveBeenCalledWith({ quizId: moonQuiz.id });
    })

    // Moon-quiz computes incorrect answers
    it('should emit quiz:failed when incorrect answers are chosen', () => { 
        const eventBus = createEventBus();
        const spyFailed = vi.fn();
        eventBus.on(EventTopics.QUIZ_FAILED, spyFailed);

        const quizUI = new QuizUI(eventBus);
        const moonQuiz = quizzes['moon-quiz'];
        quizUI.showQuiz(moonQuiz);

        for(let i = 0; i < moonQuiz.questions.length; i++) {
            const incorrectIndex = moonQuiz.questions[i].correct === 0 ? 1 : 0;

            const options = document.querySelectorAll('.quiz-option');
            (options[incorrectIndex] as HTMLButtonElement).click();

            vi.advanceTimersByTime(500); // advance timers to allow auto-advance to next question
        }

        // Retry button clicked
        const retryButton = document.querySelector('button');
        (retryButton as HTMLButtonElement).click();

        // Verify that the QUIZ_FAILED event was emitted
        expect(spyFailed).toHaveBeenCalledWith({ quizId: moonQuiz.id });
    })
});





