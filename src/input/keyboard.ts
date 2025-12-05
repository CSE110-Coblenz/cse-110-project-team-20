/**
 * Keyboard input handler with normalized state
 */
export interface KeyboardState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export class Keyboard {
  private state: KeyboardState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
    ) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.state.up = true;
        event.preventDefault();
        break;
      case 's':
      case 'arrowdown':
        this.state.down = true;
        event.preventDefault();
        break;
      case 'a':
      case 'arrowleft':
        this.state.left = true;
        event.preventDefault();
        break;
      case 'd':
      case 'arrowright':
        this.state.right = true;
        event.preventDefault();
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.state.up = false;
        break;
      case 's':
      case 'arrowdown':
        this.state.down = false;
        break;
      case 'a':
      case 'arrowleft':
        this.state.left = false;
        break;
      case 'd':
      case 'arrowright':
        this.state.right = false;
        break;
    }
  }

  getState(): KeyboardState {
    return this.state;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}
