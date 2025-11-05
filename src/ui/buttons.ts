/**
 * DOM button factory with styling
 */
export function createButton(
  text: string,
  onClick: () => void,
  className = 'game-button'
): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = className;
  button.addEventListener('click', onClick);

  // Apply styles
  button.style.cssText = `
    padding: 12px 24px;
    font-size: 18px;
    font-weight: bold;
    color: white;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    font-family: 'Arial', sans-serif;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
  });

  return button;
}

