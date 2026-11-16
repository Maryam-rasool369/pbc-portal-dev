import React, { useState } from "react";
import { HiSearch } from "react-icons/hi";
import { useRouter } from "next/router";

export interface FilterField {
  name: string;
  label: string;
  type?: 'select' | 'text' | 'multiselect';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ActionButton {
  label: string;
  route: string;
}

interface FilterProps {
  title?: string;
  heading?: string;
  description?: string;
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onApply: (filters: Record<string, string>) => void;
  onClear: () => void;
  fields?: FilterField[];
  actionButtons?: ActionButton[];
  customButton?: React.ReactNode;
  showFilterButton?: boolean;
}

export default function Filter({
  title,
  heading,
  description,
  filters,
  onChange,
  onApply,
  onClear,
  fields = [],
  actionButtons,
  customButton,
  showFilterButton = true,
}: FilterProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const filtersModified = Object.values(filters).some((v) => v);
  const handleFieldChange = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <>
      <div className="mb-6 lg:flex lg:items-center lg:justify-between">
        <div>
          {heading && (
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {heading}
            </h3>
          )}
          {description && (
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>

        <div className="mt-4 lg:mt-0 flex items-center gap-3">
          {customButton}
          {actionButtons?.map((button, index) => (
            <button
              key={index}
              onClick={() => router.push(button.route)}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-md text-sm transition-colors"
            >
              {button.label}
            </button>
          ))}
          {showFilterButton && (
            <button
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center text-sm"
              onClick={() => setOpen((prev) => !prev)}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                ></path>
              </svg>
              Filter {title}
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {open && (
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
          <div className="space-y-6">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Filter Options
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Dynamic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fields.map((field) => {
                const isMultiSelect = field.type === 'multiselect';
                const selectedValues = isMultiSelect 
                  ? (filters[field.name] || '').split(',').filter(Boolean)
                  : [];
                
                return (
                <div key={field.name} className={`space-y-2 ${isMultiSelect ? 'md:col-span-2' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {field.label}
                  </label>
                  {isMultiSelect ? (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {field.options?.map((opt) => {
                          const isSelected = selectedValues.includes(opt.value);
                          return (
                            <label
                              key={opt.value}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-2 rounded transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newValues = e.target.checked
                                    ? [...selectedValues, opt.value]
                                    : selectedValues.filter((v) => v !== opt.value);
                                  handleFieldChange(field.name, newValues.join(','));
                                }}
                                className="w-4 h-4 text-gold-600 bg-gray-100 border-gray-300 rounded focus:ring-gold-500 dark:focus:ring-gold-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {opt.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {selectedValues.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {selectedValues.length} field{selectedValues.length !== 1 ? 's' : ''} selected
                        </div>
                      )}
                    </div>
                  ) : (field.type || 'select') === 'select' ? (
                    <select
                      value={filters[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="block w-full pl-3 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow cursor-pointer"
                    >
                      <option value="">All {field.label}</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={filters[field.name] || ""}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-transparent transition-shadow"
                      />
                      {(field.type || 'select') === 'text' && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          {/* @ts-ignore */}
                          <HiSearch className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClear}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!filtersModified}
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  onApply(filters);
                  setOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-gold-600 rounded-lg hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!filtersModified}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {filtersModified && (
        <div className="mb-6 flex flex-wrap items-center gap-2 p-3 bg-gold-50 dark:bg-gold-900/30 rounded-lg">
          <span className="font-medium text-sm text-gold-700 dark:text-gold-300 mr-2">
            <svg
              className="w-5 h-5 inline mr-1 -mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              ></path>
            </svg>
            Active filters:
          </span>

          {Object.entries(filters).map(([key, value]) => {
            if (value && value !== "" && value !== "undefined") {
              // Find the field definition
              const field = fields.find((f) => f.name === key);
              const isMultiSelect = field?.type === 'multiselect';
              
              // Format the display value
              let displayValue = value;
              if (isMultiSelect && field?.options) {
                // Convert comma-separated values to labels
                const selectedValues = value.split(',').filter(Boolean);
                const labels = selectedValues
                  .map((val) => field.options?.find((opt) => opt.value === val)?.label || val)
                  .join(', ');
                displayValue = labels || value;
              }
              
              return (
                <span
                  key={key}
                  className="bg-white text-gold-800 text-xs font-medium px-3 py-1.5 rounded-full border border-gold-200 flex items-center shadow-sm"
                >
                  {field?.label || (key.charAt(0).toUpperCase() + key.slice(1))}: {displayValue}
                  <button
                    onClick={() => {
                      const newFilters = { ...filters, [key]: "" };
                      onChange(newFilters);
                    }}
                    className="ml-2 text-gold-800 hover:bg-gold-100 rounded-full h-5 w-5 flex items-center justify-center"
                    aria-label={`Remove ${key} filter`}
                  >
                    ×
                  </button>
                </span>
              );
            }
            return null;
          })}

          <button
            onClick={onClear}
            className="text-xs text-gold-600 hover:text-gold-800 hover:underline ml-auto"
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
}
