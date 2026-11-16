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
  profilePicture?: File | null;
  tradeLicense?: File | null;
  emiratesId?: File | null;
  passport?: File | null;
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
    profilePicture: null,
    tradeLicense: null,
    emiratesId: null,
    passport: null,
    longitude: 0,
    latitude: 0,
  },
  setSignUp: (signUp) => set({ signUp: signUp }),
}));
