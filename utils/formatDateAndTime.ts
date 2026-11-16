import { DateTime } from "luxon";

export const formatDateAndTime = (date: string, showTime = false, showSeconds = false) => {
  const dateTime = new Date(date);
  const dateString = dateTime.toLocaleDateString();
  const timeString = dateTime.toLocaleTimeString([], { ...(showSeconds && { second: "2-digit" }), ...{ hour: "2-digit", minute: "2-digit" } });
  return `${dateString} ${showTime ? timeString : ""}`.trim();
};

// Add 1 year (or N years) and return ISO string
export const addYearsISO = (date: string, years = 1): string => {
  try {
    const dt = DateTime.fromISO(date, { setZone: true });
    if (dt.isValid) return dt.plus({ years }).toISO();
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString();
  } catch {
    return date;
  }
};

// Format date exactly one year after the given date
export const formatOneYearAfter = (date: string, showTime = false, showSeconds = false): string => {
  const iso = addYearsISO(date, 1);
  return formatDateAndTime(iso, showTime, showSeconds);
};

export const getRelativeTimezoneOffset = (
  targetTimezone: string,
  localTimezone: string,
): string => {
  const now = DateTime.now();
  const targetTime = now.setZone(targetTimezone);
  const localTime = now.setZone(localTimezone);

  const diffMinutes = targetTime.offset - localTime.offset;
  const diffHours = diffMinutes / 60;

  const sign = diffHours >= 0 ? "+" : "-";
  const hours = Math.abs(diffHours);

  return `${sign}${hours}`;
};

export const formatDateForInput = (date: Date): string => {
  return DateTime.fromJSDate(date).toFormat("yyyy-MM-dd'T'HH:mm");
};

export const formatDateWithTimezoneForAPI = (
  dateString: string,
  timezone: string,
): string | null => {
  return DateTime.fromISO(dateString, { zone: timezone }).toISO();
};
