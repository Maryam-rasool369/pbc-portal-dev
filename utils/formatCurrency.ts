export const formatCurrency = (amount?: number | null) => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "-";
  }

  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
