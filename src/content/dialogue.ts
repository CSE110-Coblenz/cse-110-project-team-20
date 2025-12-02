/**
 * Dialogue System - displays character dialogue with click-to-continue
 */
import dialogueDataJson from '../data/dialogue.json' with { type: 'json' };

export interface Dialogue {
  id: string;
  character: string;
  text: string;
}

export interface DialogueSequence {
  [key: string]: Dialogue[];
}

export class DialogueManager {
  private container: HTMLDivElement | null = null; // Created lazily when dialogue is shown
  private currentSequence: Dialogue[] = [];
  private currentIndex = 0;
  private onCompleteCallback: (() => void) | null = null; // Optional callback
  // These are always set in constructor, so they're never null after construction
  private neilImageMouthClosed: HTMLImageElement;
  private neilImageMouthOpen: HTMLImageElement;
  private currentNeilImage: HTMLImageElement;
  private mouthAnimationTimer: number | null = null; // null when animation is stopped
  private isMouthOpen = false;

  constructor() {
    // Preload Neil images for mouth animation
    // These are always initialized, so they're never null
    this.neilImageMouthClosed = new Image();
    this.neilImageMouthClosed.src = '/neilPaws.png';
    this.neilImageMouthOpen = new Image();
    this.neilImageMouthOpen.src = '/neil-openMouth.png';
    this.currentNeilImage = this.neilImageMouthClosed;
  }

  /**
   * Start a dialogue sequence
   */
  showSequence(sequenceKey: string, onComplete?: () => void, customSequence?: DialogueSequence): void {
    let sequence: Dialogue[] | undefined;
    
    if (customSequence && customSequence[sequenceKey]) {
      sequence = customSequence[sequenceKey];
    } else {
      const sequences = dialogueDataJson as DialogueSequence;
      sequence = sequences[sequenceKey];
    }

    if (!sequence || sequence.length === 0) {
      return;
    }

    this.currentSequence = sequence;
    this.currentIndex = 0;
    this.onCompleteCallback = onComplete || null;
    const firstDialogue = this.currentSequence[0];
    if (firstDialogue) {
      this.showDialogue(firstDialogue);
      this.startMouthAnimation();
    }
  }

  /**
   * Show a single dialogue
   */
  private showDialogue(dialogue: Dialogue): void {
    if (!this.container) {
      this.createDialogueContainer();
    }

    const characterName = dialogue.character || 'System';
    const dialogueHTML = `
      <div style="display: flex; gap: 16px; align-items: flex-start;">
        <div style="flex-shrink: 0;">
          <img 
            id="neil-character-image" 
            src="${this.currentNeilImage.src}" 
            alt="${characterName}"
            style="width: 120px; height: 120px; object-fit: contain; border-radius: 8px; background: rgba(255, 255, 255, 0.1);"
          />
        </div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 14px 0; color: #4a9eff; font-family: 'Press Start 2P'; font-size: 15px;">${characterName}</h3>
          <p style="margin: 0 0 16px 0; color: #ffffff; font-family: 'Press Start 2P'; font-size: 15px; line-height: 1.6;">${dialogue.text}</p>
          <p style="margin: 0; color: #888; font-family: 'Press Start 2P'; font-size: 12px; font-style: italic; text-align: right;">Click or press any key to continue...</p>
        </div>
      </div>
    `;

    if (this.container) {
      this.container.innerHTML = dialogueHTML;
      this.container.style.display = 'flex';
      this.container.onclick = this.handleContinue.bind(this);
      
      // Add keyboard event listener for any key press
      this.setupKeyboardListener();
    }
  }

  /**
   * Create the dialogue container
   */
  private createDialogueContainer(): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 800px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 24px;
      border-radius: 16px;
      border: 2px solid #4a9eff;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
      z-index: 2000;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    `;


    document.body.appendChild(this.container);
  }

  /**
   * Setup keyboard listener for continuing dialogue
   */
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  private setupKeyboardListener(): void {
    // Remove existing listener if any
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }

    // Create new handler
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (this.isShowing()) {
        // Prevent default behavior for space/enter to avoid scrolling
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
        }
        this.handleContinue();
      }
    };

    // Add listener
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Handle continue click
   */
  private handleContinue(): void {
    this.currentIndex++;

    if (this.currentIndex >= this.currentSequence.length) {
      // Sequence complete
      this.hide();
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    } else {
      // Show next dialogue
      const nextDialogue = this.currentSequence[this.currentIndex];
      if (nextDialogue) {
        this.showDialogue(nextDialogue);
      }
    }
  }

  /**
   * Start mouth animation (alternate between open/closed)
   */
  private startMouthAnimation(): void {
    if (this.mouthAnimationTimer) {
      clearInterval(this.mouthAnimationTimer);
    }

    // Animate mouth every 250ms (speaking animation - very fast)
    this.mouthAnimationTimer = window.setInterval(() => {
      if (!this.container) return;

      const imgElement = this.container.querySelector('#neil-character-image') as HTMLImageElement;
      if (imgElement) {
        this.isMouthOpen = !this.isMouthOpen;
        // Switch between mouth open/closed images
        // Ensure consistent sizing by maintaining fixed dimensions
        // Images are always initialized in constructor, so no null check needed
        const newSrc = this.isMouthOpen 
          ? this.neilImageMouthOpen.src 
          : this.neilImageMouthClosed.src;
        
        // Update src while maintaining size constraints
        imgElement.src = newSrc;
        // Ensure size stays consistent
        imgElement.style.width = '120px';
        imgElement.style.height = '120px';
        imgElement.style.objectFit = 'contain';
      }
    }, 250);
  }

  /**
   * Stop mouth animation
   */
  private stopMouthAnimation(): void {
    if (this.mouthAnimationTimer) {
      clearInterval(this.mouthAnimationTimer);
      this.mouthAnimationTimer = null;
    }
  }

  /**
   * Hide dialogue
   */
  hide(): void {
    this.stopMouthAnimation();
    
    // Remove keyboard listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.currentSequence = [];
    this.currentIndex = 0;
  }

  /**
   * Check if dialogue is currently showing
   */
  isShowing(): boolean {
    return this.container !== null && this.container.style.display !== 'none';
  }

  /**
   * Dispose of dialogue system
   */
  dispose(): void {
    this.stopMouthAnimation();
    
    // Remove keyboard listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.currentSequence = [];
    this.currentIndex = 0;
  }
}

