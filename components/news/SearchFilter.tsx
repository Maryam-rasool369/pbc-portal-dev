import React, { useState, useCallback } from 'react';
import { HiSearch, HiX } from 'react-icons/hi';
import { debounce } from 'lodash';

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isArchived?: boolean;
  onArchivedChange?: (archived: boolean) => void;
  sortOrder?: 'newest' | 'oldest';
  onSortChange?: (sort: 'newest' | 'oldest') => void;
  showArchiveFilter?: boolean;
  showSortFilter?: boolean;
  placeholder?: string;
  className?: string;
}

export default function SearchFilter({
  searchTerm,
  onSearchChange,
  isArchived,
  onArchivedChange,
  sortOrder,
  onSortChange,
  showArchiveFilter = true,
  showSortFilter = false,
  placeholder = 'Search news by title or content...',
  className = '',
}: SearchFilterProps) {
  const [inputValue, setInputValue] = useState(searchTerm);

  // Debounced search function to avoid excessive API calls
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      onSearchChange(term);
    }, 500),
    [onSearchChange]
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    // Only start searching after 3 characters or if empty (to show all)
    if (value.length >= 3 || value.length === 0) {
      debouncedSearch(value);
    }
  };

  const clearSearch = () => {
    setInputValue('');
    onSearchChange('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {/* @ts-ignore */}
          <HiSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow"
        />
        {inputValue && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 dark:hover:text-gray-300"
          >
            {/* @ts-ignore */}
            <HiX className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Search Info */}
      {inputValue && inputValue.length < 3 && inputValue.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Type at least 3 characters to search
        </p>
      )}

      {/* Archive Filter */}
      {showArchiveFilter && onArchivedChange && (
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Show:
          </span>
          <div className="flex items-center space-x-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="archiveFilter"
                checked={isArchived === false}
                onChange={() => onArchivedChange(false)}
                className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Active
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="archiveFilter"
                checked={isArchived === true}
                onChange={() => onArchivedChange(true)}
                className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Archived
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Sort Filter */}
      {showSortFilter && onSortChange && sortOrder && (
        <div className="flex w-full items-center justify-end space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort:
          </span>
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as 'newest' | 'oldest')}
            className="block pl-3 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      )}
    </div>
  );
}
