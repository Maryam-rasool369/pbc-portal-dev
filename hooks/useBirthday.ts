import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { isTodayBirthday } from "@/utils/birthdayUtils";
import { getBirthdayTemplate, type BirthdayTemplate } from "@/services/birthdayTemplate";

interface BirthdayStatus {
  isBirthday: boolean;
  dateOfBirth: Date | string | null | undefined;
  userName: string;
  profilePicture: string | null | undefined;
  template: BirthdayTemplate | null;
}

export function useBirthday(): BirthdayStatus {
  const token = useAuthStore((state) => state.token);
  const { data: userResponse } = useQuery({
    queryKey: ["user", "birthday", token],
    queryFn: async () => {
      if (!token) return null;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token,
          },
        }
      );

      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!token,
    staleTime: Infinity,
    refetchInterval: 24 * 60 * 60 * 1000
   });

  const { data: template } = useQuery({
    queryKey: ["birthdayTemplate", token],
    queryFn: () => getBirthdayTemplate(token!),
    enabled: !!token,
    staleTime: Infinity,
  });

  const birthdayStatus = useMemo(() => {
    if (!userResponse?.data) {
      return {
        isBirthday: false,
        dateOfBirth: null,
        userName: "",
        profilePicture: null,
        template: null,
      };
    }

    const user = userResponse.data;
    const dateOfBirth = user.membership?.dateOfBirth;

    return {
      isBirthday: isTodayBirthday(dateOfBirth),
      dateOfBirth: dateOfBirth || null,
      userName: user.name || "",
      profilePicture: user.profile?.profilePicture || null,
      template: template || null,
    };
  }, [userResponse, template]);

  return birthdayStatus;
}

