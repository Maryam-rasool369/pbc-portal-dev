import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import AuthLayout from "@/layouts/AuthLayout";
import { useLoadingStore } from "@/store/useLoadingStore";
import useAuthStore from "@/store/authStore";
import CategoryInfoStep from "@/components/auth/membership/CategoryInfoStep";
import GovernmentEntityStep from "@/components/auth/membership/GovernmentEntityStep";
import StepPersonalInfo from "@/components/auth/membership/stepPersonalnfo";
import BusinessInfoStep from "@/components/auth/membership/stepBusinesslnfo";
import ProfessionalInfoStep from "@/components/auth/membership/ProfessionalInfoStep";
import MembershipInfoStep from "@/components/auth/membership/MembershipInfoStep";
import MembershipCompletion from "@/components/auth/membership/MembershipCompletion";

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const normalizeCountryName = (value?: string | null) => {
  if (!value) return "";

  const normalized = String(value).trim().toUpperCase();
  const aliases: Record<string, string> = {
    UAE: "United Arab Emirates",
    KSA: "Saudi Arabia",
  };

  return aliases[normalized] || String(value);
};


export default function MembershipForm() {
  const [step, setStep] = useState(1);
  const [isGovernmentEntity, setIsGovernmentEntity] = useState(false);
  const [prefillData, setPrefillData] = useState<any>(null);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const persistApi = (useAuthStore as any).persist;
    if (!persistApi) {
      setHasHydrated(true);
      return;
    }
    setHasHydrated(Boolean(persistApi.hasHydrated?.()));
    const unsub = persistApi.onFinishHydration?.(() => setHasHydrated(true));
    return () => {
      unsub?.();
    };
  }, []);

  const isResident = useMemo(() => {
    const residentValue = (user as any)?.profile?.isResident;
    if (typeof residentValue === "boolean") {
      return residentValue;
    }
    if (typeof residentValue === "string") {
      return residentValue.toLowerCase() === "true";
    }
    return false;
  }, [user]);

  const goToStep = (nextStep: number, nextIsGovernmentEntity?: boolean) => {
    const govEntity = nextIsGovernmentEntity ?? isGovernmentEntity;
    const limit = govEntity ? 3 : 6;
    const target = Math.max(1, Math.min(nextStep, limit));
    setStep(target);
    if (nextIsGovernmentEntity !== undefined) setIsGovernmentEntity(govEntity);
    router.replace(
      {
        pathname: router.pathname,
        query: {
          step: target,
          ...(govEntity ? { isGovernmentEntity: "true" } : {}),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const categoryPrefill = useMemo(
    () => ({
      membershipCategoryId:
        prefillData?.membershipCategoryInfo?.membershipCategoryId,
      membershipSubCategoryId:
        prefillData?.membershipCategoryInfo?.membershipSubCategoryId,
    }),
    [prefillData],
  );

  const personalPrefill = useMemo(
    () => ({
      dob: toDateInputValue(prefillData?.personalInformation?.dateOfBirth),
      passportNumber: prefillData?.personalInformation?.passportNumber,
      passportExpiry: toDateInputValue(
        prefillData?.personalInformation?.passportExpiryDate,
      ),
      emiratesId: prefillData?.personalInformation?.emiratesId,
      emiratesIdExpiry: toDateInputValue(
        prefillData?.personalInformation?.emiratesIdExpiryDate,
      ),
      mailingAddress:
        prefillData?.personalInformation?.mailingAddress ||
        prefillData?.personalInformation?.address,
    }),
    [prefillData],
  );

  const businessPrefill = useMemo(
    () => ({
      ...prefillData?.businessInformation,
      country: normalizeCountryName(prefillData?.businessInformation?.country),
      tradeLicenseExpiry: toDateInputValue(
        prefillData?.businessInformation?.tradeLicenseExpiry,
      ),
      keywords: Array.isArray(prefillData?.businessInformation?.keywords)
        ? prefillData.businessInformation.keywords.join(", ")
        : prefillData?.businessInformation?.keywords,
      hsCodes: Array.isArray(prefillData?.businessInformation?.hsCodes)
        ? prefillData.businessInformation.hsCodes.join(", ")
        : prefillData?.businessInformation?.hsCodes,
      noOfEmployees:
        prefillData?.businessInformation?.noOfEmployees != null
          ? String(prefillData.businessInformation.noOfEmployees)
          : "",
    }),
    [prefillData],
  );

  const professionalPrefill = useMemo(
    () => ({
      ...prefillData?.professionalInformation,
      languagesSpoken: Array.isArray(
        prefillData?.professionalInformation?.languagesSpoken,
      )
        ? prefillData.professionalInformation.languagesSpoken.join(", ")
        : prefillData?.professionalInformation?.languagesSpoken,
    }),
    [prefillData],
  );

  const membershipPrefill = useMemo(
    () => ({
      ...prefillData?.membershipPreferences,
      keyObjectives: Array.isArray(prefillData?.membershipPreferences?.keyObjectives)
        ? prefillData.membershipPreferences.keyObjectives.join(", ")
        : prefillData?.membershipPreferences?.keyObjectives,
      areaOfInterest: Array.isArray(prefillData?.membershipPreferences?.areaOfInterest)
        ? prefillData.membershipPreferences.areaOfInterest.join(", ")
        : prefillData?.membershipPreferences?.areaOfInterest,
    }),
    [prefillData],
  );

  const governmentPrefill = useMemo(
    () => ({
      ...prefillData?.governmentEntityInfo,
      country: normalizeCountryName(prefillData?.governmentEntityInfo?.country),
      passportExpiryDate: toDateInputValue(
        prefillData?.governmentEntityInfo?.passportExpiryDate,
      ),
      emiratesIdExpiryDate: toDateInputValue(
        prefillData?.governmentEntityInfo?.emiratesIdExpiryDate,
      ),
      tradeLicenseExpiry: toDateInputValue(
        prefillData?.governmentEntityInfo?.tradeLicenseExpiry,
      ),
    }),
    [prefillData],
  );

  const fetchMembershipPrefill = async (
    syncStepFromCompletion: boolean,
  ): Promise<any | null> => {
    if (!token) return null;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/membership-registration/my/memberships`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token,
          },
        },
      );

      const payload = await response.json();
      if (!response.ok || payload?.error) {
        return null;
      }

      const registrationData = payload?.data;
      setPrefillData(registrationData);

      if (syncStepFromCompletion) {
        const queryHasStep = Boolean(router.query.step);
        if (!queryHasStep && registrationData?.completionStatus) {
          const isGovEntity = Boolean(
            registrationData.completionStatus.isGovernmentEntity,
          );
          const currentStep = Number(
            registrationData.completionStatus.currentStep || 1,
          );
          const mappedStep = isGovEntity
            ? Math.max(1, Math.min(currentStep + 1, 3))
            : Math.max(1, Math.min(currentStep + 1, 6));

          setIsGovernmentEntity(isGovEntity);
          setStep(mappedStep);
        }
      }

      return registrationData;
    } catch (error) {
      console.error("Failed to fetch membership prefill data", error);
      return null;
    }
  };

  useEffect(() => {
    if (!router.isReady) return;

    const stepFromQuery = Number(router.query.step || 0);
    const isGovernmentFromQuery = String(
      router.query.isGovernmentEntity || "false",
    ).toLowerCase() === "true";

    setIsGovernmentEntity(isGovernmentFromQuery);

    if (stepFromQuery > 0) {
      const maxStep = isGovernmentFromQuery ? 3 : 6;
      setStep(Math.max(1, Math.min(stepFromQuery, maxStep)));
    }
  }, [router.isReady, router.query.step, router.query.isGovernmentEntity]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      // toast.error("Please sign in to continue your membership registration.");
      router.push("/authentication/sign-in");
    }
  }, [hasHydrated, token, router]);

  useEffect(() => {
    if (!hasHydrated || !token) return;
    fetchMembershipPrefill(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, token]);

  const submitStep = async (path: string, payload: Record<string, unknown>) => {
    if (!token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result?.error) {
      throw new Error(result?.error?.[0]?.msg || "Request failed.");
    }

    return result;
  };

  const prevStep = async () => {
    setLoading(true);
    try {
      await fetchMembershipPrefill(false);
      goToStep(step - 1);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCategoryInfo = async (values: {
    membershipCategoryId: number;
    membershipSubCategoryId: number;
    isGovernmentEntity: boolean;
  }) => {
    setLoading(true);
    try {
      await submitStep("/api/membership-registration/category-info", {
        membershipCategoryId: values.membershipCategoryId,
        membershipSubCategoryId: values.membershipSubCategoryId,
      });

      goToStep(2, values.isGovernmentEntity);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePostGovernmentEntityInfo = async (values: {
    country: string;
    city: string;
    designation: string;
    govtStAddress: string;
    organizationId: number;
    passportNumber: string;
    passportExpiryDate: string;
    emiratesId?: string;
    emiratesIdExpiryDate?: string;
    tradeLicenseNumber: string;
    tradeLicenseExpiry: string;
  }) => {
    const payload = {
      country: values.country,
      city: values.city,
      designation: values.designation,
      govtStAddress: values.govtStAddress,
      organizationId: values.organizationId,
      passportNumber: values.passportNumber,
      passportExpiryDate: values.passportExpiryDate,
      ...(isResident
        ? {
            emiratesId: values.emiratesId,
            emiratesIdExpiryDate: values.emiratesIdExpiryDate,
          }
        : {}),
      tradeLicenseNumber: values.tradeLicenseNumber,
      tradeLicenseExpiry: values.tradeLicenseExpiry,
    };

    setLoading(true);
    try {
      const response = await submitStep(
        "/api/membership-registration/government-entity-info",
        payload,
      );

      toast.success(response.message || "Application submitted successfully.");
      goToStep(3);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePostPersonalInfo = async (values: {
    dob: string;
    passportNumber: string;
    passportExpiry: string;
    emiratesId?: string;
    emiratesIdExpiry?: string;
    mailingAddress: string;
  }) => {
    const payload = {
      dateOfBirth: values.dob,
      passportNumber: values.passportNumber,
      passportExpiryDate: values.passportExpiry,
      ...(isResident
        ? {
            emiratesId: values.emiratesId,
            emiratesIdExpiryDate: values.emiratesIdExpiry,
          }
        : {}),
      address: values.mailingAddress,
    };

    setLoading(true);
    try {
      await submitStep("/api/membership-registration/personal-info", payload);

      goToStep(step + 1);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessInfoStep = async (values: {
    companyName: string;
    businessAddress: string;
    country: string;
    city: string;
    tradeLicenseNumber: string;
    tradeLicenseExpiry: string;
    yearOfEstablishment: string;
    affiliation: string;
    legalStatus: string;
    natureOfBusiness: string;
    businessGroup: number[];
    keywords: string;
    hsCodes: string;
    website: string;
    noOfEmployees: string;
    vatRegistrationNumber: string;
    emiratesIssuingAuthority: string;
  }) => {
    const payload = {
      companyName: values.companyName,
      businessAddress: values.businessAddress,
      city: values.city,
      country: values.country,
      tradeLicenseNumber: values.tradeLicenseNumber,
      tradeLicenseExpiry: values.tradeLicenseExpiry,
      yearOfEstablishment: values.yearOfEstablishment,
      affiliation: values.affiliation,
      legalStatus: values.legalStatus,
      natureOfBusiness: values.natureOfBusiness,
      businessGroup: values.businessGroup,
      keywords: splitCsv(values.keywords),
      website: values.website,
      hsCodes: splitCsv(values.hsCodes),
      noOfEmployees: Number(values.noOfEmployees),
      vatRegistrationNumber: values.vatRegistrationNumber,
      emiratesIssuingAuthority: values.emiratesIssuingAuthority,
    };

    setLoading(true);
    try {
      await submitStep("/api/membership-registration/business-info", payload);

      goToStep(step + 1);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePostProfessionalInfo = async (values: {
    professionalTitle: string;
    yearsOfExperience: string;
    educationalBackground: string;
    languagesSpoken: string;
    primeClients: string[];
  }) => {
    const payload = {
      professionalTitle: values.professionalTitle,
      yearsOfExperience: Number(values.yearsOfExperience),
      ...(values.educationalBackground?.trim()
        ? { educationalBackground: values.educationalBackground.trim() }
        : {}),
      languagesSpoken: splitCsv(values.languagesSpoken),
      primeClients: values.primeClients,
    };

    setLoading(true);
    try {
      await submitStep("/api/membership-registration/professional-info", payload);

      goToStep(step + 1);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePostMembershipInfo = async (values: {
    keyObjectives: string;
    areaOfInterest: string;
    expectations: string;
    selfDescription: string;
    clientIntroductionComfort: "YES" | "NO" | "";
    businessTrainingInterest: "YES" | "NO" | "";
    councilDiscoveryMethod: string;
  }) => {
    const payload = {
      keyObjectives: splitCsv(values.keyObjectives),
      areaOfInterest: splitCsv(values.areaOfInterest),
      expectations: values.expectations,
      selfDescription: values.selfDescription,
      clientIntroductionComfort: values.clientIntroductionComfort,
      businessTrainingInterest: values.businessTrainingInterest,
      councilDiscoveryMethod: values.councilDiscoveryMethod,
    };

    setLoading(true);
    try {
      const response = await submitStep(
        "/api/membership-registration/membership-specific-info",
        payload,
      );

      toast.success(response.message || "Application submitted successfully.");
      goToStep(step + 1);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <CategoryInfoStep
            nextStep={handlePostCategoryInfo}
            initialValues={categoryPrefill}
            prevStep={() => router.push("/authentication/sign-in")}
          />
        );
      case 2:
        return isGovernmentEntity ? (
          <GovernmentEntityStep
            nextStep={handlePostGovernmentEntityInfo}
            prevStep={prevStep}
            isResident={isResident}
            initialValues={governmentPrefill}
          />
        ) : (
          <StepPersonalInfo
            nextStep={handlePostPersonalInfo}
            prevStep={prevStep}
            isResident={isResident}
            initialValues={personalPrefill}
          />
        );
      case 3:
        return isGovernmentEntity ? (
          <MembershipCompletion />
        ) : (
          <BusinessInfoStep
            nextStep={handleBusinessInfoStep}
            prevStep={prevStep}
            initialValues={businessPrefill}
          />
        );
      case 4:
        return (
          <ProfessionalInfoStep
            nextStep={handlePostProfessionalInfo}
            prevStep={prevStep}
            initialValues={professionalPrefill}
          />
        );
      case 5:
        return (
          <MembershipInfoStep
            nextStep={handlePostMembershipInfo}
            prevStep={prevStep}
            initialValues={membershipPrefill}
          />
        );
      case 6:
        return <MembershipCompletion />;
      default:
        return null;
    }
  };

  return (
    <AuthLayout
      heading="Membership Form"
      headerAction={
        <button
          type="button"
          title="Logout"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white transition duration-300 hover:bg-red-600"
          onClick={() => {
            logout();
            localStorage.clear();
            sessionStorage.clear();
            router.push("/authentication/sign-in");
          }}
          aria-label="Logout"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 12h9m0 0l-3-3m3 3l-3 3"
            />
          </svg>
        </button>
      }
    >
      {renderStep()}
    </AuthLayout>
  );
}
