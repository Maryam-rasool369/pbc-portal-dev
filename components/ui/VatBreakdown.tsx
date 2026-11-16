import CurrencyAmount from "@/components/ui/CurrencyAmount";

interface VatBreakdownProps {
  baseAmount?: number | null;
  vatPercentage?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  fallbackLabel?: string;
  className?: string;
  compact?: boolean;
}

const formatPercentage = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `${rounded}%`;
};

const VatBreakdown = ({
  baseAmount,
  vatPercentage,
  vatAmount,
  totalAmount,
  fallbackLabel = "Price (excl. VAT)",
  className = "",
  compact = false,
}: VatBreakdownProps) => {
  const hasVat =
    vatPercentage !== null &&
    vatPercentage !== undefined &&
    vatAmount !== null &&
    vatAmount !== undefined &&
    totalAmount !== null &&
    totalAmount !== undefined;

  const containerClasses = compact
    ? "rounded-lg border border-gray-700 bg-gray-900/40 p-3"
    : "rounded-lg border border-gray-700 bg-gray-900/40 p-4";

  return (
    <div className={`${containerClasses} ${className}`.trim()}>
      {hasVat ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Base Amount</span>
            <CurrencyAmount amount={baseAmount} className="text-white font-medium" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">VAT ({formatPercentage(vatPercentage)})</span>
            <CurrencyAmount amount={vatAmount} className="text-white font-medium" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-700">
            <span className="text-sm text-gray-200">Total Amount</span>
            <CurrencyAmount amount={totalAmount} className="text-base font-semibold text-white" />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{fallbackLabel}</span>
          <CurrencyAmount amount={baseAmount} className="text-base font-semibold text-white" />
        </div>
      )}
    </div>
  );
};

export default VatBreakdown;
