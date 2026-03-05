import React, { useRef, useEffect, useCallback } from 'react';
import type { NodeStatus } from '../utils/nodeStatus';

export type HealthFilter = 'all' | 'up' | 'down' | 'unknown';

interface NodeSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  healthFilter: HealthFilter;
  onHealthFilterChange: (filter: HealthFilter) => void;
  nodeCounts: Record<NodeStatus | 'total', number>;
}

const FILTER_OPTIONS: { value: HealthFilter; label: string; colorClass: string; activeClass: string }[] = [
  { value: 'all', label: 'All', colorClass: 'text-gray-400', activeClass: 'bg-gray-600 text-white' },
  { value: 'up', label: 'Up', colorClass: 'text-green-400', activeClass: 'bg-green-600 text-white' },
  { value: 'down', label: 'Down', colorClass: 'text-red-400', activeClass: 'bg-red-600 text-white' },
  { value: 'unknown', label: 'Unknown', colorClass: 'text-yellow-400', activeClass: 'bg-yellow-600 text-white' },
];

const NodeSearchFilter: React.FC<NodeSearchFilterProps> = ({
  searchQuery,
  onSearchChange,
  healthFilter,
  onHealthFilterChange,
  nodeCounts,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl/Cmd+F or "/" to focus search (only when not already in an input)
    const target = e.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (e.key === '/' && !isInputFocused) {
      e.preventDefault();
      inputRef.current?.focus();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onSearchChange('');
      inputRef.current?.blur();
    }
  };

  const getCount = (filter: HealthFilter): number => {
    if (filter === 'all') return nodeCounts.total;
    return nodeCounts[filter] ?? 0;
  };

  return (
    <div
      className="flex flex-col gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-3 min-w-[260px]"
      data-testid="node-search-filter"
    >
      {/* Search Input */}
      <div className="relative">
        <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search nodes... ( / )"
          className="w-full pl-7 pr-8 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          data-testid="node-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
            title="Clear search"
            data-testid="node-search-clear"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {/* Health Filter Toggles */}
      <div className="flex gap-1" role="group" aria-label="Health status filter">
        {FILTER_OPTIONS.map(({ value, label, colorClass, activeClass }) => {
          const isActive = healthFilter === value;
          const count = getCount(value);
          return (
            <button
              key={value}
              onClick={() => onHealthFilterChange(value)}
              className={`flex-1 text-xs py-1 px-2 rounded font-medium transition-colors ${
                isActive
                  ? activeClass
                  : `bg-gray-100 dark:bg-gray-700 ${colorClass} hover:bg-gray-200 dark:hover:bg-gray-600`
              }`}
              title={`Show ${label.toLowerCase()} nodes (${count})`}
              data-testid={`health-filter-${value}`}
              aria-pressed={isActive}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(NodeSearchFilter);
