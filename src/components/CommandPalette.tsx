import { useEffect, useRef } from 'react';
import './CommandPalette.css';

export interface Command {
  id: string;
  label: string;
  shortcut: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCommandClick = (command: Command) => {
    command.action();
    onClose();
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Command Palette"
        aria-modal="true"
        className="command-palette"
        tabIndex={-1}
      >
        <div className="command-palette-header">
          <h2>Command Palette</h2>
          <button
            onClick={onClose}
            className="command-palette-close"
            aria-label="Close command palette"
          >
            ×
          </button>
        </div>
        <div className="command-palette-commands">
          {commands.map((command) => (
            <button
              key={command.id}
              className="command-palette-command"
              onClick={() => handleCommandClick(command)}
            >
              <span className="command-palette-command-label">{command.label}</span>
              <span className="command-palette-command-shortcut">{command.shortcut}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
