import React from "react";
import { HiX, HiArrowRight } from "react-icons/hi";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

interface InformationChangedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  changes: FieldChange[];
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const humanizeFieldName = (field: string): string =>
  field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Empty";
  if (typeof value === "string" && ISO_DATE_PATTERN.test(value)) {
    return formatDateAndTime(value, true, false);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

export default function InformationChangedModal({
  isOpen,
  onClose,
  title,
  changes,
}: InformationChangedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-middle bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Information Changed
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {/* @ts-ignore */}
                <HiX className="h-5 w-5" />
              </button>
            </div>
            {title && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {title}
              </p>
            )}
          </div>

          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-3">
            {changes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No field-level changes recorded for this action.
              </p>
            ) : (
              changes.map((change, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    {humanizeFieldName(change.field)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 text-sm rounded-md bg-red-50 text-red-700 line-through dark:bg-red-900/30 dark:text-red-300">
                      {formatValue(change.from)}
                    </span>
                    {/* @ts-ignore */}
                    <HiArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="px-2 py-1 text-sm rounded-md bg-green-50 text-green-700 font-medium dark:bg-green-900/30 dark:text-green-300">
                      {formatValue(change.to)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
