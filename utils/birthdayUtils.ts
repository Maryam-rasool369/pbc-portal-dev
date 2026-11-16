
export function isTodayBirthday(dateOfBirth: Date | string | null | undefined): boolean {
  if (!dateOfBirth) return false;

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  return (
    birthDate.getMonth() === today.getMonth() &&
    birthDate.getDate() === today.getDate()
  );
}

export function getBirthdayAge(dateOfBirth: Date | string | null | undefined): number | null {
  if (!dateOfBirth || !isTodayBirthday(dateOfBirth)) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
export function formatBirthdayMessage(userName: string, age?: number | null): string {
  if (age !== null && age !== undefined) {
    return `Happy ${age}${getOrdinalSuffix(age)} Birthday, ${userName}!`;
  }
  return `Happy Birthday, ${userName}!`;
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

