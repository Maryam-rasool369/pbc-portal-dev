import React from "react";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

interface ModalFieldOption {
  value: string | number;
  label: string;
}

interface ModalField {
  id: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "select"
    | "file"
    | "checkbox"
    | "datetime-local"
    | "multiselect-tags"
    | "multiselect-checkboxes"
    | "social-links-table";
  options?: ModalFieldOption[];
  value: any;
  onChange: (e: React.ChangeEvent<any>) => void;
  onAdd?: (value: string) => void;
  onRemove?: (value: string | number) => void;
  onToggle?: (value: number) => void;
  className?: string;
  accept?: string;
  min?: string;
  helperText?: string;
  preview?: string;
  pattern?: string;
  placeholder?: string;
  fileInfo?: { name: string; type: string };
  maxItems?: number;
  socialLinkErrors?: Record<number, string>;
  onSocialLinkAddRow?: () => void;
  onSocialLinkRemoveRow?: (index: number) => void;
  onSocialLinkUpdate?: (
    index: number,
    field: "platform" | "url",
    value: string,
  ) => void;
}

interface UniversalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  fields: ModalField[];
  warningMessage?: string;
}

// Fee calculation helper
const calculateFees = (price: number) => {
  const pbcFee = price * 0.02; // 2%
  const stripeFee = price * 0.049 + 1; // 4.9% + 1 dirham
  const totalDeductions = pbcFee + stripeFee;
  const sellerReceives = price - totalDeductions;
  const taxAmount = price * 0.05; // 5% tax (informational only)
  
  return {
    pbcFee: Number(pbcFee.toFixed(2)),
    stripeFee: Number(stripeFee.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    sellerReceives: Number(sellerReceives.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
  };
};

const getAddProductPrice = (fields: ModalField[]) => {
  const priceField = fields.find((field) => field.id === "price");
  const directPrice = Number(priceField?.value);

  if (Number.isFinite(directPrice) && directPrice > 0) {
    return directPrice;
  }

  const variantsField = fields.find((field) => field.id === "variants");
  const variants = Array.isArray(variantsField?.value)
    ? variantsField.value
    : [];

  if (variants.length === 0) {
    return 0;
  }

  const defaultVariant =
    variants.find((variant: any) => Boolean(variant?.isDefault)) || variants[0];
  const defaultVariantPrice = Number(defaultVariant?.price);

  return Number.isFinite(defaultVariantPrice) && defaultVariantPrice > 0
    ? defaultVariantPrice
    : 0;
};

const UniversalFormModal: React.FC<UniversalFormModalProps> = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  isSubmitting,
  fields,
  warningMessage,
}) => {
  if (!isOpen) return null;

  // Check if this is the Add Product modal and get price field
  const isAddProductModal = title === "Add Product";
  const price = isAddProductModal ? getAddProductPrice(fields) : 0;
  const fees = calculateFees(price);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Warning message for Stripe account */}
            {warningMessage && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span>{warningMessage}</span>
                </p>
              </div>
            )}
            {fields.map((
              {
                id,
                label,
                type = "text",
                accept = "image/*",
                options,
                value,
                onChange,
                onAdd,
                onRemove,
                onToggle,
                className = "",
                min,
                helperText,
                preview,
                pattern,
                placeholder,
                fileInfo,
                maxItems,
                socialLinkErrors,
                onSocialLinkAddRow,
                onSocialLinkRemoveRow,
                onSocialLinkUpdate,
              },
              index
            ) => (
                <div key={`${id}-${index}`}>
                  <label
                    htmlFor={id}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {label}
                  </label>

                  {type === "textarea" ? (
                    <textarea
                      id={id}
                      name={id}
                      value={value}
                      onChange={onChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : type === "select" && options ? (
                    <select
                      id={id}
                      name={id}
                      value={value}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select an option</option>
                      {options.map((opt, idx) => (
                        <option key={`${String(opt.value)}-${idx}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : type === "file" ? (
                    <>
                      <input
                        type="file"
                        id={id}
                        name={id}
                        accept={accept}
                        onChange={onChange}
                        className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gold-50 file:text-gold-700 dark:file:bg-gold-900 dark:file:text-gold-200 hover:file:bg-gold-100 dark:hover:file:bg-gold-800"
                      />
                      {/* Show file info for newly uploaded PDFs */}
                      {fileInfo && fileInfo.type === 'application/pdf' && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center">
                          <svg
                            className="w-8 h-8 text-red-600 dark:text-red-400 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">PDF File Selected</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{fileInfo.name}</p>
                          </div>
                          <span className="ml-2 px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">PDF</span>
                        </div>
                      )}
     {preview && (
          <div className="mt-2 border rounded overflow-hidden h-40 bg-gray-100">
            {accept?.includes('video') ? (
              <video
                src={preview}
                controls
                className="w-full h-full object-contain"
              />
            ) : fileInfo?.type === "application/pdf" ? (
              <iframe
                src={preview}
                className="w-full h-full"
              />
            ) : (
              <img
                src={preview}
                alt={`Preview of ${label}`}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}
                    </>
                  ) : type === "checkbox" ? (
                    <input
                      type="checkbox"
                      id={id}
                      name={id}
                      checked={value}
                      onChange={onChange}
                      className="h-5 w-5 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                    />
                  ) : type === "multiselect-tags" ? (
                    <>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          id={`${id}-input`}
                          placeholder={placeholder || "Enter value (e.g., 1234.5678)"}
                          pattern={pattern}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              if (input.value.trim() && onAdd) {
                                onAdd(input.value.trim());
                                input.value = "";
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`${id}-input`) as HTMLInputElement;
                            if (input && input.value.trim() && onAdd) {
                              onAdd(input.value.trim());
                              input.value = "";
                            }
                          }}
                          className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-md transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {helperText && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{helperText}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(value) && value.map((item: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-gold-100 dark:bg-gold-900 text-gold-800 dark:text-gold-200 rounded-full text-sm"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => onRemove && onRemove(item)}
                              className="hover:text-red-600 dark:hover:text-red-400"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {(!value || value.length === 0) && (
                          <span className="text-sm text-gray-400 italic">No items added</span>
                        )}
                      </div>
                    </>
                  ) : type === "multiselect-checkboxes" && options ? (
                    <>
                      {helperText && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{helperText}</p>
                      )}
                      <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 space-y-2">
                        {options.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">Loading options...</p>
                        ) : (
                          options.map((opt) => (
                            <label
                              key={opt.value}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={Array.isArray(value) && value.includes(Number(opt.value))}
                                onChange={() => onToggle && onToggle(Number(opt.value))}
                                className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {opt.label}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                      {Array.isArray(value) && value.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {value.length} selected
                        </p>
                      )}
                    </>
                  ) : type === "social-links-table" ? (
                    <>
                      <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden mb-3">
                        <div className="grid grid-cols-12 bg-gold-50 dark:bg-gold-900/30 border-b border-gray-300 dark:border-gray-600">
                          <div className="col-span-3 px-3 py-2 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                            Platform
                          </div>
                          <div className="col-span-7 px-3 py-2 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 border-x border-gray-300 dark:border-gray-600">
                            Profile URL
                          </div>
                          <div className="col-span-2 px-3 py-2 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                            Remove
                          </div>
                        </div>

                        {Array.isArray(value) && value.length > 0 ? (
                          value.map(
                            (
                              socialLink: { platform: string; url: string },
                              rowIndex: number,
                            ) => (
                              <div
                                key={`${id}-social-row-${rowIndex}`}
                                className="grid grid-cols-12 border-b last:border-b-0 border-gray-200 dark:border-gray-700"
                              >
                                <div className="col-span-3 p-2">
                                  <select
                                    value={socialLink.platform || ""}
                                    onChange={(e) =>
                                      onSocialLinkUpdate?.(
                                        rowIndex,
                                        "platform",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  >
                                    <option value="">Select</option>
                                    {(options || []).map((opt, idx) => {
                                      const selectedElsewhere = Array.isArray(value)
                                        ? value.some(
                                            (
                                              item: {
                                                platform: string;
                                                url: string;
                                              },
                                              itemIndex: number,
                                            ) =>
                                              itemIndex !== rowIndex &&
                                              item?.platform === String(opt.value),
                                          )
                                        : false;

                                      return (
                                        <option
                                          key={`${id}-social-platform-${String(opt.value)}-${idx}`}
                                          value={String(opt.value)}
                                          disabled={selectedElsewhere}
                                        >
                                          {opt.label}
                                          {selectedElsewhere
                                            ? " (Already added)"
                                            : ""}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                <div className="col-span-7 p-2 border-x border-gray-200 dark:border-gray-700">
                                  <input
                                    type="url"
                                    value={socialLink.url || ""}
                                    onChange={(e) =>
                                      onSocialLinkUpdate?.(
                                        rowIndex,
                                        "url",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder={
                                      placeholder || "Paste profile URL"
                                    }
                                  />
                                </div>

                                <div className="col-span-2 p-2 flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSocialLinkRemoveRow?.(rowIndex)
                                    }
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-gold-500 text-gold-600 hover:bg-gold-100 dark:text-gold-300 dark:hover:bg-gold-900/30"
                                  >
                                    ×
                                  </button>
                                </div>

                                {socialLinkErrors?.[rowIndex] && (
                                  <div className="col-span-12 px-3 pb-2 text-xs text-red-500 dark:text-red-400">
                                    {socialLinkErrors[rowIndex]}
                                  </div>
                                )}
                              </div>
                            ),
                          )
                        ) : (
                          <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 italic">
                            No social links added
                          </div>
                        )}
                      </div>

                      {helperText && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          {helperText}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => onSocialLinkAddRow?.()}
                        disabled={
                          !!maxItems &&
                          Array.isArray(value) &&
                          value.length >= maxItems
                        }
                        className="px-4 py-2 border border-dashed border-gold-500 text-gold-700 dark:text-gold-300 rounded-md hover:bg-gold-50 dark:hover:bg-gold-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Another Link
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type={type}
                        id={id}
                        name={id}
                        value={value}
                        onChange={onChange}
                        min={min}
                        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white${className && ` ${className}`}`}
                      />
                      {helperText && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {helperText}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ),
            )}

            {/* Fee Breakdown for Add Product Modal */}
            {/* {isAddProductModal && price > 0 && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Fee Breakdown
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Product Price:</span>
                    <CurrencyAmount amount={price} className="font-medium" />
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>PBC Marketplace Fee (2%):</span>
                    <CurrencyAmount amount={-fees.pbcFee} />
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Transaction Fee (4.9% + 1 dirham):</span>
                    <CurrencyAmount amount={-fees.stripeFee} />
                  </div>
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2"></div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Total Deductions:</span>
                    <CurrencyAmount amount={-fees.totalDeductions} className="font-medium" />
                  </div>
                  <div className="flex justify-between text-lg font-bold text-green-600 dark:text-green-400 pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span>You Receive:</span>
                    <CurrencyAmount amount={fees.sellerReceives} />
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Note:</span> Tax (5% = <CurrencyAmount amount={fees.taxAmount} />) is your responsibility as the seller. The full product price is transferred to you, and you are required to pay the tax separately.
                    </p>
                  </div>
                </div>
              </div>
            )} */}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md transition-colors"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UniversalFormModal;
