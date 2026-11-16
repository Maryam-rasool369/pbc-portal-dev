const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface BirthdayTemplate {
  id: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  color: string;
  html?: string;
}

export const getBirthdayTemplate = async (token: string): Promise<BirthdayTemplate | null> => {
  const response = await fetch(`${API_URL}/api/user/birthday-template`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });
  const data = await response.json();
  if (!response.ok || data.error) return null;
  return data.data;
};

export const saveBirthdayTemplate = async (
  token: string,
  template: { text: string; fontSize: number; fontFamily: string; fontStyle: string; color: string }
): Promise<BirthdayTemplate> => {
  const response = await fetch(`${API_URL}/api/user/birthday-template`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify(template),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to save template");
  }
  return data.data;
};

