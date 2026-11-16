import { create } from "zustand";

interface signUpUser {
  name?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
  emailOtp?: string;
  phoneOtp?: string;
  bio?: string;
  country?: string;
  city?: string;
  nativeCountry?: string;
  nativeCity?: string;
  profilePicture?: File | null;
  tradeLicense?: File | null;
  tradeLicenseSecondary?: File | null;
  emiratesId?: File | null;
  emiratesIdSecondary?: File | null;
  passport?: File | null;
  passportSecondary?: File | null;
  bioVideo?: File | null;
  socialLinks?: Array<{ platform: string; url: string }>;
  isResident?: boolean;
  longitude?: Number;
  latitude?: Number;
}

interface SignUpState {
  signUp: signUpUser;
  setSignUp: (signUp: signUpUser) => void;
}

export const useSignUpStore = create<SignUpState>((set) => ({
  signUp: {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    emailOtp: "",
    phoneOtp: "",
    bio: "",
    country: "",
    city: "",
    nativeCountry: "",
    nativeCity: "",
    profilePicture: null,
    tradeLicense: null,
    tradeLicenseSecondary: null,
    emiratesId: null,
    emiratesIdSecondary: null,
    passport: null,
    passportSecondary: null,
    bioVideo: null,
    socialLinks: [],
    isResident: undefined,
    longitude: 0,
    latitude: 0,
  },
  setSignUp: (signUp) => set({ signUp: signUp }),
}));
