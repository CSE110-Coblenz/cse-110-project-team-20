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
  private container: HTMLDivElement | null = null;
  private currentSequence: Dialogue[] = [];
  private currentIndex = 0;
  private onCompleteCallback: (() => void) | null = null;
  private neilImageMouthClosed: HTMLImageElement | null = null;
  private neilImageMouthOpen: HTMLImageElement | null = null;
  private currentNeilImage: HTMLImageElement | null = null;
  private mouthAnimationTimer: number | null = null;
  private isMouthOpen = false;

  constructor() {
    // Preload Neil images for mouth animation
    this.loadNeilImages();
  }

  private loadNeilImages(): void {
    // Load mouth closed (neilPaws.png)
    this.neilImageMouthClosed = new Image();
    this.neilImageMouthClosed.onload = () => {
      // Ensure image loaded successfully
      console.log('Neil mouth closed image loaded');
    };
    this.neilImageMouthClosed.onerror = () => {
      console.error('Failed to load neilPaws.png');
    };
    this.neilImageMouthClosed.src = '/neilPaws.png';

    // Load mouth open (neil-openmouth.png)
    this.neilImageMouthOpen = new Image();
    this.neilImageMouthOpen.onload = () => {
      // Ensure image loaded successfully
      console.log('Neil mouth open image loaded');
    };
    this.neilImageMouthOpen.onerror = () => {
      console.error('Failed to load neil-openMouth.png');
    };
    this.neilImageMouthOpen.src = '/neil-openMouth.png';

    this.currentNeilImage = this.neilImageMouthClosed;
  }

  /**
   * Start a dialogue sequence
   */
  showSequence(sequenceKey: string, onComplete?: () => void): void {
    const sequences = dialogueDataJson as DialogueSequence;
    const sequence = sequences[sequenceKey];

    if (!sequence || sequence.length === 0) {
      console.warn(`Dialogue sequence "${sequenceKey}" not found`);
      return;
    }

    this.currentSequence = sequence;
    this.currentIndex = 0;
    this.onCompleteCallback = onComplete || null;
    this.showDialogue(this.currentSequence[0]);
    this.startMouthAnimation();
  }

  /**
   * Show a single dialogue
   */
  private showDialogue(dialogue: Dialogue): void {
    if (!this.container) {
      this.createDialogueContainer();
    }

    // Update dialogue content
    const characterName = dialogue.character || 'System';
    const dialogueText = dialogue.text;

    // Create dialogue HTML
    const dialogueHTML = `
      <div style="display: flex; gap: 16px; align-items: flex-start;">
        <div style="flex-shrink: 0;">
          <img 
            id="neil-character-image" 
            src="${this.currentNeilImage?.src || '/neilPaws.png'}" 
            alt="${characterName}"
            style="width: 120px; height: 120px; min-width: 120px; min-height: 120px; max-width: 120px; max-height: 120px; object-fit: contain; border-radius: 8px; background: rgba(255, 255, 255, 0.1); display: block;"
          />
        </div>
        <div style="flex: 1; min-width: 0;">
          <h3 style="margin: 0 0 12px 0; color: #4a9eff; font-size: 20px; font-family: Arial, sans-serif;">
            ${characterName}
          </h3>
          <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif;">
            ${dialogueText}
          </p>
          <p style="margin: 0; color: #888; font-size: 12px; font-style: italic; text-align: right;">
            Click to continue...
          </p>
        </div>
      </div>
    `;

    if (this.container) {
      this.container.innerHTML = dialogueHTML;
      this.container.style.display = 'flex';

      // Update Neil image reference for animation
      const imgElement = this.container.querySelector('#neil-character-image') as HTMLImageElement;
      if (imgElement) {
        imgElement.addEventListener('click', this.handleContinue.bind(this));
      }

      // Make entire dialogue box clickable
      this.container.addEventListener('click', this.handleContinue.bind(this));
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

    // Hover effect
    this.container.addEventListener('mouseenter', () => {
      if (this.container) {
        this.container.style.transform = 'translateX(-50%) translateY(-4px)';
        this.container.style.boxShadow = '0 12px 40px rgba(74, 158, 255, 0.4)';
      }
    });

    this.container.addEventListener('mouseleave', () => {
      if (this.container) {
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.7)';
      }
    });

    document.body.appendChild(this.container);
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
      this.showDialogue(this.currentSequence[this.currentIndex]);
    }
  }

  /**
   * Start mouth animation (alternate between open/closed)
   */
  private startMouthAnimation(): void {
    if (this.mouthAnimationTimer) {
      clearInterval(this.mouthAnimationTimer);
    }

    // Animate mouth every 400ms (speaking animation - faster)
    this.mouthAnimationTimer = window.setInterval(() => {
      if (!this.container) return;

      const imgElement = this.container.querySelector('#neil-character-image') as HTMLImageElement;
      if (imgElement) {
        this.isMouthOpen = !this.isMouthOpen;
        // Switch between mouth open/closed images
        // Ensure consistent sizing by maintaining fixed dimensions
        if (this.neilImageMouthOpen && this.neilImageMouthClosed) {
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
      }
    }, 400);
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
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.currentSequence = [];
    this.currentIndex = 0;
  }
}

