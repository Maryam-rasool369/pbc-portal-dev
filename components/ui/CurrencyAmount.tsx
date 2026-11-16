import DirhamSymbol from "@/components/ui/DirhamSymbol";

type CurrencyAmountProps = {
  amount?: number | null;
  className?: string;
  amountClassName?: string;
  symbolClassName?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export const formatCurrencyNumber = (
  amount?: number | null,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
) => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "-";
  }

  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
};

const CurrencyAmount = ({
  amount,
  className = "",
  amountClassName = "",
  symbolClassName = "",
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}: CurrencyAmountProps) => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return <span className={className}>-</span>;
  }

  return (
    <span className={`inline-flex items-baseline gap-1 whitespace-nowrap ${className}`}>
      <DirhamSymbol
        className={`h-[0.82em] w-[0.95em] shrink-0 translate-y-[0.04em] ${symbolClassName}`}
        title="UAE dirham"
      />
      <span className={amountClassName}>
        {formatCurrencyNumber(amount, minimumFractionDigits, maximumFractionDigits)}
      </span>
    </span>
  );
};

export default CurrencyAmount;
