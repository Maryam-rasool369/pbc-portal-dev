import React from 'react';
import { HiExclamationCircle, HiX } from 'react-icons/hi';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getTypeClasses = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        };
      case 'warning':
        return {
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
        };
      case 'info':
        return {
          icon: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        };
      default:
        return {
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
        };
    }
  };

  const typeClasses = getTypeClasses();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Close button */}
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500"
              onClick={onClose}
              disabled={loading}
            >
              <span className="sr-only">Close</span>
              {/* @ts-ignore */}
              <HiX className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            {/* Icon */}
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-${type === 'danger' ? 'red' : type === 'info' ? 'blue' : 'yellow'}-100 dark:bg-${type === 'danger' ? 'red' : type === 'info' ? 'blue' : 'yellow'}-900 sm:mx-0 sm:h-10 sm:w-10`}>
              {/* @ts-ignore */}
              <HiExclamationCircle className={`h-6 w-6 ${typeClasses.icon}`} />
            </div>

            {/* Content */}
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${typeClasses.button}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
