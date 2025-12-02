import { Dialog } from './dialog.js';
import { createButton } from './buttons.js';
import type { EventBus } from '../engine/events.js';

//List of Puzzles 
// The password is all the capital letters in the text.
import puzzlesDataJson from '../data/puzzle.json' with { type: 'json' };
type PuzzleSet = Record<string, string[]>;
const PUZZLES = puzzlesDataJson as PuzzleSet;


 //Options for launching the password cracker minigame.
 //The puzzle/target are now generated internally.

export interface PasswordCrackerOptions {
  //A unique ID for this minigame instance 
  id: string;

   //The title of the minigame window (e.g., "ISS System Access") 
  title: string;

  puzzleSetKey: string;
}

export class PasswordCracker {
  private dialog: Dialog;
  private eventBus: EventBus;
  private options: PasswordCrackerOptions | null = null;
  private inputElement: HTMLInputElement | null = null;
  private feedbackElement: HTMLDivElement | null = null;

  //Correct password for the current, randomly selected puzzle
  private currentTarget: string = '';

  constructor(eventBus: EventBus) {
    this.dialog = new Dialog();
    this.eventBus = eventBus;
  }
  

  //Generates the password from the puzzle text (all caps).

  private extractPassword(paragraph: string): string {
    // Use a regex to find all capital letters (A-Z)
    const matches = paragraph.match(/\b[A-Z]{2,}\b/g);
    if (!matches) {
      // Fallback in case a puzzle is bad
      return 'ERROR';
    }
    return matches.join('');
  }


   //Show the password cracker minigame.

  public show(options: PasswordCrackerOptions): void {
    this.options = options;

    const puzzleSet = PUZZLES[options.puzzleSetKey]

    if(!puzzleSet || puzzleSet.length === 0 ){
      console.error(`Password puzzle set "${options.puzzleSetKey}" not found!`);
      this.currentTarget = "FALLBACK";
      this.renderMainUI("Error: Puzzle set not found. Enter FALLBACK.");
      return;
    }
    const puzzelIndex = Math.floor(Math.random() * puzzleSet.length)
    const puzzelText = puzzleSet[puzzelIndex]
    this.currentTarget = this.extractPassword(puzzelText)
    this.renderMainUI(puzzelText)
  }


  //Renders the main input screen for the minigame.

  private renderMainUI(puzzlePrompt: string): void {
    if (!this.options) return;

    const { title } = this.options;

    // The prompt is now the puzzle paragraph
    const html = `
      <h2 style="margin-bottom: 16px; color: #4a9eff;">${title}</h2>
      <p style="
        margin-bottom: 24px; 
        color: #cccccc; 
        font-family: 'Press Start 2P'; 
        font-size: 16px; 
        line-height: 1.6;
        background: #1a1a2e; 
        padding: 12px;
        border-radius: 4px;
        border: 1px solid #444;
      ">
        ${puzzlePrompt}
      </p>
      
      <input 
        type="text" 
        id="password-input"
        placeholder="Enter decoded password..."
        style="
          padding: 12px 16px;
          font-size: 18px;
          font-family: 'Press Start 2P';
          border: 2px solid #667eea;
          border-radius: 8px;
          background: #2a2a3e;
          color: white;
          width: 100%;
          box-sizing: border-box;
          text-transform: uppercase; /* Auto-capitalize user input */
        "
      />
      
      <div id="password-feedback" style="margin-top: 12px; color: #ff0000; min-height: 1.2em;"></div>
    `;

    this.dialog.show(html);

    this.inputElement = this.dialog.content.querySelector<HTMLInputElement>(
      '#password-input'
    );
    this.feedbackElement = this.dialog.content.querySelector<HTMLDivElement>(
      '#password-feedback'
    );

    const submitButton = createButton('Submit', () => {
      this.handleSubmit();
    });
    submitButton.style.marginTop = '16px';
    this.dialog.content.appendChild(submitButton);

    this.inputElement?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSubmit();
      }
    });

    this.inputElement?.focus();
  }


   //Handles the password submission logic.

  private handleSubmit(): void {
    if (!this.inputElement || !this.options) return;

    // Compare guess (auto-uppercased) to the stored target
    const guess = this.inputElement.value.trim().toUpperCase();
    
    if (guess === this.currentTarget) {
      // PASS
      this.eventBus.emit('minigame:passed', { minigameId: this.options.id });
      this.showResult(true);
    } else {
      if (this.feedbackElement) {
        this.feedbackElement.textContent = 'Access Denied. Try Again.';
      }
      // FAILED
      this.eventBus.emit('minigame:failed', { minigameId: this.options.id });
      
      this.inputElement.value = '';
      this.inputElement.focus();
    }
  }



  private showResult(success: boolean): void {
    if (!this.options || !success) return;

    const html = `
      <h2 style="margin-bottom: 16px; color: #00ff00; font-family: 'Press Start 2P'; ">Access Granted</h2>
      <p style="margin-bottom: 16px; color: #cccccc; font-family: 'Press Start 2P'; ">System unlocked.</p>
    `;
    this.dialog.show(html);

    const continueButton = createButton('Continue', () => {
      this.dialog.hide();
    });
    this.dialog.content.appendChild(continueButton);
  }


  public isShowing() : boolean{
    return this.dialog.isShowing()
  }

  public dispose(): void {
    this.dialog.dispose();
  }
}
