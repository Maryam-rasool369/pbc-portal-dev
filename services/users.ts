import { UserProfile } from "@/types/user";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ActivityInteraction = "CLICK" | "COPY";
type ActivityInteractionType = "EMAIL" | "PHONE";

interface CreateActivityLogInput {
  interaction: ActivityInteraction;
  interactionType: ActivityInteractionType;
  payload: string;
}

export const fetchUserProfile = async (token: string): Promise<UserProfile> => {
  const response = await fetch(`${API_URL}/api/user`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const userData = await response.json();

  if (!response.ok || userData.error) {
    throw new Error(userData.error?.[0]?.msg || "Error fetching user profile");
  }

  const membership = userData.data.membership;
  const membershipData = membership ? {
    membershipId: membership.membershipId || undefined,
    decision_at: membership.decision_at || undefined,
    lastBillingDate: membership.lastBillingDate || undefined,
    nextBillingDate: membership.nextBillingDate || undefined,
    membershipCategory: membership.membershipCategoryRef ? {
      id: membership.membershipCategoryRef.id,
      name: membership.membershipCategoryRef.name,
    } : undefined,
    membershipSubCategory: membership.membershipSubCategoryRef ? {
      id: membership.membershipSubCategoryRef.id,
      name: membership.membershipSubCategoryRef.name,
    } : undefined,
    hsCodes: membership.hsCodes || undefined,
    businessGroups: membership.businessGroup && Array.isArray(membership.businessGroup)
      ? membership.businessGroup.map((bg: any) => ({
          id: bg.id,
          name: bg.name,
        }))
      : undefined,
    emiratesId: membership.emiratesId || undefined,
    tradeLicenseExpiry: membership.tradeLicenseExpiry || undefined,
    passportExpiryDate: membership.passportExpiryDate || undefined,
    emiratesIdExpiryDate: membership.emiratesIdExpiryDate || undefined,
    govtStAddress: membership.govtStAddress || undefined,
    mailingAddress: membership.mailingAddress || undefined,
    dateOfBirth: membership.dateOfBirth || undefined,
    passportNumber: membership.passportNumber || undefined,
    companyName: membership.companyName || undefined,
    country: membership.country || undefined,
    city: membership.city || undefined,
    tradeLicenseNumber: membership.tradeLicenseNumber || undefined,
    yearOfEstablishment: membership.yearOfEstablishment || undefined,
    affiliation: membership.affiliation || undefined,
    legalStatus: membership.legalStatus || undefined,
    natureOfBusiness: membership.natureOfBusiness || undefined,
    keywords: membership.keywords?.length ? membership.keywords : undefined,
    website: membership.website || undefined,
    noOfEmployees: membership.noOfEmployees || undefined,
    vatRegistrationNumber: membership.vatRegistrationNumber || undefined,
    emiratesIssuingAuthority: membership.emiratesIssuingAuthority || undefined,
    businessAddress: membership.businessAddress || undefined,
    designation: membership.designation || undefined,
    organizationId: membership.organizationId ?? undefined,
    organization: membership.organization
      ? { id: membership.organization.id, name: membership.organization.name }
      : undefined,
    professionalTitle: membership.professionalTitle || undefined,
    educationalBackground: membership.educationalBackground || undefined,
    yearsOfExperience: membership.yearsOfExperience ?? undefined,
    languagesSpoken: membership.languagesSpoken?.length ? membership.languagesSpoken : undefined,
    primeClients: membership.primeClients?.length ? membership.primeClients : undefined,
    keyObjectives: membership.keyObjectives?.length ? membership.keyObjectives : undefined,
    areaOfInterest: membership.areaOfInterest?.length ? membership.areaOfInterest : undefined,
    expectations: membership.expectations || undefined,
    selfDescription: membership.selfDescription || undefined,
    councilDiscoveryMethod: membership.councilDiscoveryMethod || undefined,
    clientIntroductionComfort: membership.clientIntroductionComfort || undefined,
    businessTrainingInterest: membership.businessTrainingInterest || undefined,
  } : undefined;

  return {
    id: userData.data.id,
    name: userData.data.name,
    email: userData.data.email,
    isDocumentReviewPending: Boolean(userData?.data?.isDocumentReviewPending),
    role: userData.data.Role.name,
    company: userData.data.company || "Not specified",
    location: userData.data.location || "Not specified",
    phoneNumber: userData.data.phoneNumber || "Not specified",
    joinDate: userData.data.createdAt,
    profilePicture: userData.data.profile.profilePicture,
    isActive: userData.data.isActive,
    isContactsVerfied: userData?.data?.isContactsVerfied || false,
    profile: {
      country: userData.data.profile.country || null,
      city: userData.data.profile.city || undefined,
      nativeCity: userData.data.profile.nativeCity || undefined,
      nativeCountry: userData.data.profile.nativeCountry || undefined,
      bio: userData.data.profile.bio || undefined,
      gender: userData.data.profile.gender || undefined,
      bioVideo: userData.data.profile.bioVideo || undefined,
      socialLinks: Array.isArray(userData.data.profile.socialLinks)
        ? userData.data.profile.socialLinks.map((link: any) => ({
            platform: String(link.platform || "").toLowerCase(),
            url: String(link.url || ""),
          }))
        : [],
      facebookSocial: userData.data.profile.facebookSocial || undefined,
      linkedInSocial: userData.data.profile.linkedInSocial || undefined,
      calendlyLink: userData.data.profile.calendlyLink || undefined,
      tradeLicense: userData.data.profile.tradeLicense || undefined,
      tradeLicenseSecondary:
        userData.data.profile.tradeLicenseSecondary || undefined,
      passport: userData.data.profile.passport || undefined,
      passportSecondary: userData.data.profile.passportSecondary || undefined,
      emiratesId: userData.data.profile.emiratesId || undefined,
      emiratesIdSecondary:
        userData.data.profile.emiratesIdSecondary || undefined,
      emiratesIdNumber: membership?.emiratesId || undefined,
      isResident: userData.data.profile.isResident ?? undefined,
      latitude: userData.data.profile.latitude || undefined,
      longitude: userData.data.profile.longitude || undefined,
    },
    membership: membershipData,
  };
};

export const fetchAllCandidateUsers = async (
  token: string,
): Promise<UserProfile[]> => {
  const response = await fetch(`${API_URL}/api/user/elections-category`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const userData = await response.json();

  if (!response.ok || userData.error) {
    throw new Error(userData.error?.[0]?.msg || "Error fetching users");
  }

  return userData.data;
};

export const enableUser = async (
  token: string,
  userId: number,
): Promise<any> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/user/enable-user/${userId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.[0]?.msg || "Failed to enable user");
  }
  return data;
};

export const disableUser = async (
  token: string,
  userId: number,
): Promise<any> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/user/disable-user/${userId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.[0]?.msg || "Failed to disable user");
  }
  return data;
};

export const getUserById = async (
  token: string,
  userId: number,
): Promise<any> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/user/${userId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch user");
  }
  return data.data;
};

export const createActivityLog = async (
  token: string,
  { interaction, interactionType, payload }: CreateActivityLogInput,
): Promise<any> => {
  const typeFieldMap: Record<ActivityInteractionType, "email" | "phoneNumber"> = {
    EMAIL: "email",
    PHONE: "phoneNumber",
  };

  const field = typeFieldMap[interactionType];

  const res = await fetch(`${API_URL}/api/activity-log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify({
      interaction,
      interactionType,
      ...(field && payload ? { [field]: payload } : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to log activity");
  }

  return data;
};
