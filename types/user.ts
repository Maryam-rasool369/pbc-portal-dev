export interface UserProfile {
  isDocumentReviewPending: boolean;
  id: number;
  name: string;
  email: string;
  role: string;
  Role?: {
    id: number;
    name: string;
  };
  company: string;
  location: string;
  phoneNumber: string;
  joinDate: string;
  profilePicture: string;
  isActive: boolean;
  isContactsVerfied: boolean;
  profile: {
    socialLinks?: Array<{
      platform: string;
      url: string;
    }>;
    country: string | null;
    city?: string | null;
    nativeCountry?: string;
    nativeCity?: string;
    bio?: string;
    gender?: string;
    facebookSocial?: string;
    linkedInSocial?: string;
    calendlyLink?: string;
    tradeLicense?: string;
    tradeLicenseSecondary?: string;
    passport?: string;
    passportSecondary?: string;
    emiratesId?: string;
    emiratesIdSecondary?: string;
    emiratesIdNumber?: string;
    isResident?: boolean;
    bioVideo?: string;
    latitude?: string;
    longitude?: string;
  };
  membership?: {
    membershipId?: string;
    decision_at?: string; // decision_at
    lastBillingDate?: string; // calculated from decision_at
    nextBillingDate?: string; // calculated from decision_at + 1 year
    membershipCategory?: {
      id: number;
      name: string;
    };
    membershipSubCategory?: {
      id: number;
      name: string;
    };
    businessGroups?: Array<{
      id: number;
      name: string;
    }>;
    hsCodes?: string[] | number[];
    emiratesId?: string;
    tradeLicenseExpiry?: string;
    passportExpiryDate?: string;
    emiratesIdExpiryDate?: string;
    govtStAddress?: string;
    mailingAddress?: string;
    dateOfBirth?: string;
    passportNumber?: string;
    companyName?: string;
    country?: string;
    city?: string;
    tradeLicenseNumber?: string;
    yearOfEstablishment?: number;
    affiliation?: string;
    legalStatus?: string;
    natureOfBusiness?: string;
    keywords?: string[];
    website?: string;
    noOfEmployees?: number;
    vatRegistrationNumber?: string;
    emiratesIssuingAuthority?: string;
    businessAddress?: string;
    designation?: string;
    organizationId?: number;
    organization?: { id: number; name: string };
    professionalTitle?: string;
    educationalBackground?: string;
    yearsOfExperience?: number;
    languagesSpoken?: string[];
    primeClients?: string[];
    keyObjectives?: string[];
    areaOfInterest?: string[];
    expectations?: string;
    selfDescription?: string;
    councilDiscoveryMethod?: string;
    clientIntroductionComfort?: string;
    businessTrainingInterest?: string;
  };
}
