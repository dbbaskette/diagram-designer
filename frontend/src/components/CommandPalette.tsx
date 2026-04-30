import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  icon?: string;
  group: 'Diagram' | 'Navigate' | 'View' | 'Action';
  keywords?: string[];
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter((cmd) => {
      const haystack = [cmd.label, cmd.group, ...(cmd.keywords || [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [commands, query]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  if (!open) return null;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) {
        cmd.run();
        onClose();
      }
    }
  };

  // Group commands for display
  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.group] = acc[cmd.group] || []).push(cmd);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKey}
      >
        <div className="flex items-center px-3 border-b border-gray-200 dark:border-gray-700">
          <i className="fas fa-search text-gray-400 mr-2"></i>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            data-testid="command-palette-input"
          />
          <kbd className="ml-2 text-xs px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No matching commands
            </div>
          ) : (
            Object.entries(groups).map(([group, cmds]) => (
              <div key={group}>
                <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">
                  {group}
                </div>
                {cmds.map((cmd) => {
                  const idx = filtered.indexOf(cmd);
                  const isActive = idx === active;
                  return (
                    <button
                      key={cmd.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => {
                        cmd.run();
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      data-testid={`command-${cmd.id}`}
                    >
                      {cmd.icon && (
                        <i className={`${cmd.icon} ${isActive ? 'text-white' : 'text-gray-400'} w-4`}></i>
                      )}
                      <span className="flex-1">{cmd.label}</span>
                      {cmd.hint && (
                        <span className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                          {cmd.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 flex gap-3">
          <span><kbd className="px-1 border rounded">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 border rounded">↵</kbd> run</span>
          <span><kbd className="px-1 border rounded">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
