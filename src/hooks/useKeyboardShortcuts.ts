import { useEffect } from 'react';

export interface KeyboardShortcutsConfig {
  onSave: () => void;
  onAIAssist: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onCommandPalette: () => void;
  isLoading: boolean;
  canSave: boolean;
}

/**
 * Custom hook to handle global keyboard shortcuts
 * Respects input focus state and loading states
 */
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const { onSave, onAIAssist, onNext, onPrevious, onCommandPalette, isLoading, canSave } = config;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Don't trigger shortcuts while typing in input fields
      if (isInputFocused) {
        return;
      }

      // Don't trigger shortcuts while loading (except navigation)
      const isNavigationKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
      if (isLoading && !isNavigationKey) {
        return;
      }

      // Cmd+S or Ctrl+S: Save
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (canSave && !isLoading) {
          onSave();
        }
        return;
      }

      // Cmd+I or Ctrl+I: AI Assist
      if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
        event.preventDefault();
        if (!isLoading) {
          onAIAssist();
        }
        return;
      }

      // Cmd+K or Ctrl+K: Command Palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onCommandPalette();
        return;
      }

      // Arrow keys: Navigation (without modifier keys)
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          event.preventDefault();
          onNext();
          return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          event.preventDefault();
          onPrevious();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, onAIAssist, onNext, onPrevious, onCommandPalette, isLoading, canSave]);
}
