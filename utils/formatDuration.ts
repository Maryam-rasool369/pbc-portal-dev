export const formatDuration = (totalSeconds?: number | null): string => {
  if (!totalSeconds || totalSeconds <= 0) return "0m";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};
